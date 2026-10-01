"""Prepare idempotent service-role SQL from validated official ESCO downloads.

Run import-esco-translations.py first. Apply these chunks through a trusted admin
connection, then compare actual counts to docs/esco-language-import.json.
Never run as anon/authenticated or broaden grants to make an import succeed.
"""
import json
from pathlib import Path
folder=Path('/tmp/arynqo-esco-languages')
for locale in ['en','fr','es','de','it']:
    rows=json.loads((folder/f'{locale}-prepared.json').read_text())
    for offset in range(0,len(rows),1000):
        chunk=rows[offset:offset+1000]
        if any(row[1]!=locale for row in chunk): raise ValueError('Unexpected locale')
        encoded=json.dumps(chunk,ensure_ascii=False).replace("'","''")
        query=f"""insert into public.profile_tag_translations(tag_id,locale,label,normalized_label)
select t.id,r.value->>1,r.value->>2,public.profile_tag_key(r.value->>2)
from jsonb_array_elements('{encoded}'::jsonb) r(value)
join public.profile_tags t on t.source_uri='http://data.europa.eu/esco/skill/'||(r.value->>0)
where t.source='esco' and t.source_version='v1.2.1' and t.status='approved'
on conflict(tag_id,locale) do update set label=excluded.label,normalized_label=excluded.normalized_label;
"""
        (folder/f'{locale}-{offset//1000:02}-import.sql').write_text(query)
print('SQL chunks prepared; no database writes performed.')
