"""Fetch pinned official ESCO labels by concept URI. No database writes."""
import concurrent.futures
import hashlib
import html
import json
import math
import re
import subprocess
from pathlib import Path
from urllib.parse import urlencode

folder = Path("/tmp/arynqo-esco-languages")
folder.mkdir(exist_ok=True)
version = "v1.2.1"
def load(pair):
    language, page = pair
    target = folder / f"{language}-{page}.json"
    if not target.exists():
        url = "https://ec.europa.eu/esco/api/search?" + urlencode({"type":"skill","language":language,"limit":1000,"offset":page,"selectedVersion":version,"text":"","viewObsolete":"false"})
        subprocess.run(["curl","--fail","--silent","--show-error","--max-time","60",url,"-o",str(target)],check=True)
    payload=json.loads(target.read_text())
    if payload["language"]!=language or payload["offset"]!=page or payload["limit"]!=1000: raise ValueError("Unexpected ESCO page")
    return payload

manifest={"source":"https://ec.europa.eu/esco/api/search","version":version,"copyright":"© European Union · CC BY 4.0","languages":{}}
for language in ["en","fr","es","de","it"]:
    first=load((language,0)); count=first["total"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        pages=[first]+list(pool.map(load,[(language,page) for page in range(1,math.ceil(count/1000))]))
    rows=[row for page in pages for row in page["_embedded"]["results"]]
    if len(rows)!=count or len({row["uri"] for row in rows})!=count: raise ValueError("Incomplete ESCO language")
    prepared=[]
    for row in rows:
        if not re.fullmatch(r"http://data.europa.eu/esco/skill/[0-9a-f-]{36}",row["uri"]): raise ValueError("Unexpected concept URI")
        label=" ".join(html.unescape(re.sub(r"<[^>]*>","",row["preferredLabel"][language])).split())
        if not label or len(label)>500 or re.search(r"[\x00-\x1f\x7f]",label): raise ValueError("Invalid translated label")
        prepared.append([row["uri"].rsplit("/",1)[1],language,label])
    prepared.sort()
    encoded=json.dumps(prepared,ensure_ascii=False,separators=(",",":"))
    (folder/f"{language}-prepared.json").write_text(encoded)
    manifest["languages"][language]={"concepts":count,"sha256":hashlib.sha256(encoded.encode()).hexdigest()}
    print(language,count,flush=True)
Path("docs/esco-language-import.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
