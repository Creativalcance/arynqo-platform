#!/usr/bin/env python3
"""Download and validate a pinned official ESCO snapshot; never writes to a database."""
import argparse, concurrent.futures, hashlib, html, json, math, re, subprocess, unicodedata
from pathlib import Path
from urllib.parse import urlencode

def key(value):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c)).split())

def prepare(rows):
    rejected = {'invalid_label': 0, 'ambiguous_label': 0}
    grouped = {}
    for row in rows:
        uri = row.get('uri', '')
        raw = row.get('preferredLabel', {}).get('pt')
        if not re.fullmatch(r'http://data.europa.eu/esco/skill/[0-9a-f-]{36}', uri) or not isinstance(raw, str):
            raise ValueError('Unexpected concept or missing Portuguese label')
        label = ' '.join(html.unescape(re.sub(r'<[^>]+>', '', raw)).split())
        if not 1 <= len(label) <= 80 or re.search(r'[\x00-\x1f\x7f<>@,;]', label):
            rejected['invalid_label'] += 1
            continue
        grouped.setdefault(key(label), []).append([uri.rsplit('/', 1)[1], label])
    accepted = []
    for entries in grouped.values():
        if len({entry[0] for entry in entries}) > 1:
            rejected['ambiguous_label'] += len(entries)
        else:
            accepted.append(entries[0])
    return sorted(accepted, key=lambda x: x[0]), rejected

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--version', default='v1.2.1', choices=['v1.2.1'])
    args = parser.parse_args()
    out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
    def page(number):
        target = out / f'page-{number}.json'
        if not target.exists():
            params = urlencode({'type': 'skill', 'language': 'pt', 'limit': 1000, 'offset': number, 'selectedVersion': args.version, 'text': '', 'viewObsolete': 'false'})
            url = 'https://ec.europa.eu/esco/api/search?' + params
            temporary = target.with_suffix('.tmp')
            subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '90', '--retry', '2', url, '-o', str(temporary)], check=True)
            temporary.rename(target)
        result = json.loads(target.read_text())
        if result.get('offset') != number or result.get('limit') != 1000 or result.get('language') != 'pt':
            raise ValueError('Unexpected page response')
        return result
    first = page(0); count = first['total']
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        pages = [first] + list(pool.map(page, range(1, math.ceil(count / 1000))))
    rows = [row for p in pages for row in p['_embedded']['results']]
    if len(rows) != count or len({r['uri'] for r in rows}) != count or any(p['total'] != count for p in pages):
        raise ValueError('Incomplete, repeated or inconsistent snapshot; nothing will be imported')
    accepted, rejected = prepare(rows)
    payload = json.dumps(accepted, ensure_ascii=False, separators=(',', ':'))
    (out / 'prepared.json').write_text(payload)
    manifest = {'source': 'https://ec.europa.eu/esco/api/search', 'version': args.version, 'language': 'pt', 'source_count': count, 'accepted': len(accepted), 'excluded': rejected, 'sha256': hashlib.sha256(payload.encode()).hexdigest(), 'transformation': 'Remove HTML emphasis and decode entities; preserve names, exclude overlong/unsupported labels and ambiguous normalized labels.', 'copyright': '© European Union; ESCO data reused with attribution under the European Commission reuse policy (CC BY 4.0).', 'licence_url': 'https://commission.europa.eu/legal-notice_en'}
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    for i in range(0, len(accepted), 150):
        (out / f'batch-{i//150}.json').write_text(json.dumps(accepted[i:i+150], ensure_ascii=False, separators=(',', ':')))
    print(json.dumps(manifest, ensure_ascii=False))
if __name__ == '__main__': main()
