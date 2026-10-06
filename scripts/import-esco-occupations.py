"""Pinned ESCO occupation catalogue; public data, no profile data or DB writes."""
import concurrent.futures, hashlib, html, json, math, re, urllib.request
from pathlib import Path
from urllib.parse import urlencode
folder=Path('/tmp/arynqo-occupations');folder.mkdir(exist_ok=True)
def fetch(page):
 p=folder/f'{page}.json'
 if not p.exists():
  url='https://ec.europa.eu/esco/api/search?'+urlencode(dict(type='occupation',language='pt',limit=1000,offset=page,selectedVersion='v1.2.1',text='',viewObsolete='false'))
  with urllib.request.urlopen(url,timeout=60) as r:p.write_bytes(r.read())
 d=json.loads(p.read_text());assert d['offset']==page and d['language']=='pt';return d
first=fetch(0)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:pages=[first]+list(pool.map(fetch,range(1,math.ceil(first['total']/1000))))
rows=[v for p in pages for v in p['_embedded']['results']];assert len(rows)==first['total']==len({v['uri'] for v in rows})
out=[]
for v in rows:
 assert re.fullmatch(r'http://data.europa.eu/esco/occupation/[0-9a-f-]{36}',v['uri'])
 labels={l:html.unescape(re.sub('<[^>]*>','',v['preferredLabel'][l])).strip() for l in ['pt','en','fr','es','de','it']}
 assert all(labels.values())
 out.append(dict(id=v['uri'].rsplit('/',1)[1],labels=labels))
out.sort(key=lambda v:v['id']);data=json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n'
Path('lib/data/occupations.json').write_text(data)
Path('docs/occupation-catalogue.json').write_text(json.dumps(dict(source='https://ec.europa.eu/esco/api/search',version='v1.2.1',count=len(out),sha256=hashlib.sha256(data.encode()).hexdigest(),copyright='© European Union · CC BY 4.0',licence='https://commission.europa.eu/legal-notice_en',note='Official labels and stable concept IDs; no inferred occupational equivalences.'),indent=2)+'\n')
print('Validated occupations:',len(out))
