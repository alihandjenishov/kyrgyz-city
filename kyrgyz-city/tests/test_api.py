import os
from pathlib import Path
from fastapi.testclient import TestClient
from main import app, CATALOGUE

client = TestClient(app)

def test_health_and_real_content_counts():
    assert client.get('/api/health').json()['counts'] == {'vocabulary':160,'lessons':18,'locations':10,'dialogues':10,'quests':10}

def test_shell_and_indexable_lessons():
    for path in ['/', '/game', '/about', '/privacy', '/lessons/ru', '/lessons/en', '/lessons/ky']:
        r = client.get(path)
        assert r.status_code == 200
        assert 'Kyrgyz City' in r.text
    english = client.get('/lessons/en/home').text
    assert '<html lang="en">' in english
    assert 'Window' in english and 'Терезе' in english
    assert 'Открыть текстовые уроки' not in english
    text_only = client.get('/lessons/en/home?text=1').text
    assert 'Window' in text_only and 'type="module"' not in text_only
    assert client.get('/lessons/de').status_code == 422
    assert client.get('/lessons/ru/missing').status_code == 404

def test_built_assets_exist_and_are_served():
    import json
    manifest = Path(__file__).resolve().parents[1] / 'static/app/.vite/manifest.json'
    assert manifest.exists(), 'Run npm run build before testing'
    entry = json.loads(manifest.read_text())['index.html']
    for asset in [entry['file'], *entry['css']]:
        assert client.get('/static/app/' + asset).status_code == 200
    assert client.get('/static/favicon.svg').status_code == 200

def test_api_collections_and_filters():
    for kind in ['locations','lessons','dialogues','quests','vocabulary']:
        assert isinstance(client.get('/api/'+kind).json(), list)
    assert client.get('/api/locations/home').json()['ky'] == 'Үй'
    assert client.get('/api/locations/unknown').status_code == 404
    assert client.get('/api/lessons/home').json()['word_ids']
    assert client.get('/api/dialogues/market').status_code == 200
    rows=client.get('/api/vocabulary?category=home&level=A0&q=терезе').json()
    assert [w['id'] for w in rows] == ['home-3']
    assert client.get('/api/vocabulary',params={'q':'x'*101}).status_code == 422

def test_pronunciation_is_honest_and_validated():
    r=client.post('/api/verify-pronunciation',json={'expected_text':'Өрүк','language':'ky'})
    assert r.status_code == 200
    assert r.json()['status'] == 'not_available'
    assert r.json()['score'] is None
    for value in ['', 'a'*501]:
        assert client.post('/api/verify-pronunciation',json={'expected_text':value}).status_code == 422
    assert client.post('/api/verify-pronunciation',json={'expected_text':'Өрүк','language':'ru'}).status_code == 422

def test_catalogue_links_and_conversation_branches():
    ids={k:{x['id'] for x in rows} for k,rows in CATALOGUE.items()}
    for w in CATALOGUE['vocabulary']:
        assert w['location'] in ids['locations']
        assert all(w['translations'][lang].strip() for lang in ['ru','en','ky'])
        assert w['review_status']=='draft'
    for location in CATALOGUE['locations']:
        assert location['dialogue'] in ids['dialogues']
        assert location['word_ids']
    for d in CATALOGUE['dialogues']:
        nodes={n['id']:n for n in d['nodes']}
        at='0';seen=set()
        while at is not None:
            assert at not in seen, 'Correct branch must terminate'
            seen.add(at);n=nodes[at]
            correct=[o for o in n['options'] if o['correct']]
            assert len(correct)==1
            assert any(not o['correct'] and o['next']==at for o in n['options'])
            at=correct[0]['next']
        assert len(seen)>=3
    for q in CATALOGUE['quests']:
        assert len(q['steps'])>=3
        for s in q['steps']:
            category={'visit':'locations','dialogue':'dialogues','lesson':'lessons','word':'vocabulary'}[s['event']]
            assert s['target'] in ids[category]

def test_seo_uses_only_configured_origin(monkeypatch):
    monkeypatch.delenv('PUBLIC_ORIGIN',raising=False)
    assert '<loc>' not in client.get('/sitemap.xml').text
    monkeypatch.setenv('PUBLIC_ORIGIN','https://learn.example')
    assert '<loc>https://learn.example/lessons/en/home</loc>' in client.get('/sitemap.xml').text
    assert 'Sitemap: https://learn.example/sitemap.xml' in client.get('/robots.txt').text
    assert 'rel="canonical" href="https://learn.example/"' in client.get('/').text

def test_security_headers():
    r=client.get('/')
    assert r.headers['x-content-type-options']=='nosniff'
    assert 'camera=()' in r.headers['permissions-policy']
