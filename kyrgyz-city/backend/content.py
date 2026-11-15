"""Editable, validated-at-startup teaching catalogue."""
import json
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class Translation(BaseModel):
    ru: str
    en: str
    ky: str

class Word(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    ky: str
    translations: Translation
    category: str
    level: Literal['A0', 'A1', 'A2', 'B1']
    example: str
    context: Translation
    grammar: str | None
    audio: str | None
    location: str
    review_status: Literal['draft', 'reviewed']

def load_catalogue():
    root = Path(__file__).parent / 'content'
    catalogue = {name: json.loads((root / f'{name}.json').read_text(encoding='utf-8')) for name in
                 ['vocabulary', 'lessons', 'locations', 'dialogues', 'quests']}
    catalogue['vocabulary'] = [Word.model_validate(w).model_dump() for w in catalogue['vocabulary']]
    for name, rows in catalogue.items():
        if len({r['id'] for r in rows}) != len(rows):
            raise ValueError(f'Duplicate IDs in {name}')
    words = {w['id'] for w in catalogue['vocabulary']}
    locations = {l['id'] for l in catalogue['locations']}
    for lesson in catalogue['lessons']:
        if not set(lesson['word_ids']) <= words or lesson['location'] not in locations:
            raise ValueError(f"Broken lesson references: {lesson['id']}")
    for location in catalogue['locations']:
        if not set(location['word_ids']) <= words:
            raise ValueError(f"Broken location references: {location['id']}")
    return catalogue
