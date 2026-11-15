"""Kyrgyz City: one FastAPI origin serves API, React game, and indexable lessons."""
import json
import os
from pathlib import Path
from typing import Literal
from xml.sax.saxutils import escape
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from backend.content import load_catalogue

ROOT = Path(__file__).parent
CATALOGUE = load_catalogue()
app = FastAPI(title='Kyrgyz City', version='0.1.1')
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')
templates = Jinja2Templates(directory=ROOT / 'templates')
Lang = Literal['ru', 'en', 'ky']
TITLES = {'ru': 'Изучай кыргызский, исследуя город', 'en': 'Learn Kyrgyz through adventure', 'ky': 'Шаарды кыдырып кыргызча үйрөн'}
DESCRIPTIONS = {'ru': 'Бесплатная игра для изучения кыргызского: 3D-город, 18 уроков, диалоги и речевая практика.', 'en': 'A free Kyrgyz learning game with a 3D city, 18 lessons, everyday conversations and speaking practice.', 'ky': 'Кыргыз тилин үйрөнүү үчүн акысыз оюн: 3D шаар, 18 сабак, диалогдор жана сүйлөө көнүгүүлөрү.'}

def asset_tags():
    manifest = ROOT / 'static/app/.vite/manifest.json'
    if not manifest.exists():
        return {'js': None, 'css': []}
    entry = json.loads(manifest.read_text(encoding='utf-8'))['index.html']
    return {'js': '/static/app/' + entry['file'], 'css': ['/static/app/' + f for f in entry.get('css', [])]}

def render(request, template='index.html', lang='ru', **extra):
    origin = os.environ.get('PUBLIC_ORIGIN', '').rstrip('/')
    return templates.TemplateResponse(request=request, name=template, context={
        'lang': lang, 'title': extra.get('page_title', TITLES[lang]), 'description': DESCRIPTIONS[lang],
        'text_only': request.query_params.get('text') == '1',
        'alternates': {l: (origin + '/lessons/' + l + ('/' + request.url.path.split('/')[3] if len(request.url.path.split('/')) > 3 else '') if request.url.path.startswith('/lessons/') else origin + request.url.path + '?lang=' + l) for l in ['ru','en','ky']},
        'assets': asset_tags(), 'origin': origin, 'canonical': origin + request.url.path + ('?lang=' + lang if lang != 'ru' and not request.url.path.startswith('/lessons/') else '') if origin else None,
        'authors': 'Создано учениками 10B класса Бишкекского кыргызско-турецкого лицея имени Чингиза Айтматова: Шабданов Эмир, Дженишов Алихан и Исламбеков Алишер',
        **extra})

@app.middleware('http')
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(self)'
    return response

@app.get('/', response_class=HTMLResponse)
@app.get('/game', response_class=HTMLResponse)
@app.get('/about', response_class=HTMLResponse)
@app.get('/privacy', response_class=HTMLResponse)
def shell(request: Request, lang: Lang = 'ru'):
    return render(request, lang=lang)

@app.get('/lessons/{lang}', response_class=HTMLResponse)
def lesson_index(request: Request, lang: Lang):
    return render(request, 'lessons.html', lang=lang, lessons=CATALOGUE['lessons'], vocabulary=CATALOGUE['vocabulary'], selected=None)

@app.get('/lessons/{lang}/{lesson_id}', response_class=HTMLResponse)
def lesson_detail(request: Request, lang: Lang, lesson_id: str):
    lesson = find('lessons', lesson_id)
    return render(request, 'lessons.html', lang=lang, lessons=[lesson], vocabulary=CATALOGUE['vocabulary'], selected=lesson_id, page_title=lesson['title'][lang])

def find(collection, item_id):
    item = next((x for x in CATALOGUE[collection] if x['id'] == item_id), None)
    if item is None:
        raise HTTPException(404, detail=f'{collection}: unknown id')
    return item

@app.get('/api/locations')
def locations(): return CATALOGUE['locations']
@app.get('/api/locations/{location_id}')
def location(location_id: str): return find('locations', location_id)
@app.get('/api/lessons')
def lessons(): return CATALOGUE['lessons']
@app.get('/api/lessons/{lesson_id}')
def lesson(lesson_id: str): return find('lessons', lesson_id)
@app.get('/api/vocabulary')
def vocabulary(category: str | None = None, location: str | None = None, level: str | None = None, q: str = Query('', max_length=100)):
    return [w for w in CATALOGUE['vocabulary'] if
            (not category or w['category'] == category) and (not location or w['location'] == location) and
            (not level or w['level'] == level) and (not q or q.casefold() in (w['ky'] + ' ' + ' '.join(w['translations'].values())).casefold())]
@app.get('/api/dialogues')
def dialogues(): return CATALOGUE['dialogues']
@app.get('/api/dialogues/{dialogue_id}')
def dialogue(dialogue_id: str): return find('dialogues', dialogue_id)
@app.get('/api/quests')
def quests(): return CATALOGUE['quests']

class PronunciationRequest(BaseModel):
    expected_text: str = Field(min_length=1, max_length=500)
    language: Literal['ky'] = 'ky'

@app.post('/api/verify-pronunciation')
def verify_pronunciation(payload: PronunciationRequest):
    return {'status': 'not_available', 'score': None, 'expected_text': payload.expected_text,
            'reason': 'No validated Kyrgyz pronunciation model is integrated. Audio is not uploaded or stored.'}

@app.get('/api/health')
def health(): return {'status': 'ok', 'version': app.version, 'counts': {k: len(v) for k, v in CATALOGUE.items()}}

@app.get('/robots.txt', response_class=Response)
def robots():
    origin = os.environ.get('PUBLIC_ORIGIN', '').rstrip('/')
    return Response('User-agent: *\nAllow: /\nDisallow: /api/\n' + (f'Sitemap: {origin}/sitemap.xml\n' if origin else ''), media_type='text/plain')

@app.get('/sitemap.xml', response_class=Response)
def sitemap():
    origin = os.environ.get('PUBLIC_ORIGIN', '').rstrip('/')
    paths = ['/', '/about', '/privacy'] + [f'/lessons/{l}' for l in ['ru','en','ky']] + [f'/lessons/{l}/{x["id"]}' for l in ['ru','en','ky'] for x in CATALOGUE['lessons']]
    # Relative <loc> entries are invalid; an unconfigured local build returns an empty sitemap.
    urls = ''.join(f'<url><loc>{escape(origin+p)}</loc></url>' for p in paths) if origin else ''
    return Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>', media_type='application/xml')
