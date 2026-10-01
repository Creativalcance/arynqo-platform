"""Build static locale catalogs offline from installed Argos translation packages.

Build tooling only: no translation service or model is used by the website.
Run with argostranslate/ctranslate2 available in a dedicated Python environment.
"""
import gc
import json
import re
from pathlib import Path
import argostranslate.package as packages
import ctranslate2

root = Path(__file__).resolve().parents[1]
folder = root / "lib/i18n/messages"
source = json.loads((folder / "pt.json").read_text())
installed = packages.get_installed_packages()
protected = re.compile(r"(\{\d+\}|https?://[^\s]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|ARYNQO|CRIATIVALCANCE|UNIPESSOAL LDA|Supabase|OpenAI|Resend|Google Analytics|ESCO|localStorage|sessionStorage|arynqo_[a-z_]+)")

def translate_many(texts, from_code, to_code):
    pkg = next(p for p in installed if p.from_code == from_code and p.to_code == to_code)
    model = ctranslate2.Translator(str(pkg.package_path / "model"), device="cpu", compute_type="int8", inter_threads=1, intra_threads=4)
    segments = []
    parts = []
    for text in texts:
        current = []
        for index, fragment in enumerate(protected.split(text)):
            if index % 2 or not re.search(r"[A-Za-zÀ-ÿ]", fragment):
                current.append((False, fragment))
                continue
            # Keep input below model context limits without dropping a legal paragraph.
            for sentence in re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-Ý])", fragment):
                leading = sentence[:len(sentence) - len(sentence.lstrip())]
                trailing = sentence[len(sentence.rstrip()):]
                clean = sentence.strip()
                if not clean:
                    current.append((False, sentence))
                    continue
                tokens = pkg.tokenizer.encode(clean)
                if len(tokens) > 450:
                    words = clean.split()
                    chunks = [" ".join(words[offset:offset + 160]) for offset in range(0, len(words), 160)]
                else:
                    chunks = [clean]
                for chunk_index, chunk in enumerate(chunks):
                    current.append((True, len(segments), leading if chunk_index == 0 else " ", trailing if chunk_index == len(chunks) - 1 else ""))
                    segments.append(chunk)
                current.append((False, " "))
        parts.append(current)
    output = []
    for offset in range(0, len(segments), 64):
        batch = segments[offset:offset + 64]
        prefix = [[pkg.target_prefix]] * len(batch) if pkg.target_prefix else None
        results = model.translate_batch([pkg.tokenizer.encode(t) for t in batch], target_prefix=prefix, beam_size=4, replace_unknowns=True, max_decoding_length=768)
        for result in results:
            text = pkg.tokenizer.decode(result.hypotheses[0])
            if pkg.target_prefix and text.startswith(pkg.target_prefix): text = text[len(pkg.target_prefix):]
            output.append(text.strip())
        if offset % 512 == 0: print(from_code, to_code, offset, "/", len(segments), flush=True)
    translated = []
    for text_parts in parts:
        result = "".join(part[2] + output[part[1]] + part[3] if part[0] else part[1] for part in text_parts)
        # A separator was added after translated fragments; remove it before protected tokens
        # only when the source had no boundary. Cleanup retains all placeholders verbatim.
        translated.append(re.sub(r" +", " ", result).strip())
    del model
    gc.collect()
    return translated

keys = list(source)
for locale in ["en", "fr", "es", "de", "it"]:
    target = folder / f"{locale}.json"
    previous = json.loads(target.read_text()) if target.exists() else {}
    missing = [key for key in keys if key not in previous]
    if not missing: continue
    english = translate_many(missing, "pt", "en") if locale == "en" else [json.loads((folder / "en.json").read_text())[key] for key in missing]
    values = english if locale == "en" else translate_many(english, "en", locale)
    previous.update(zip(missing, values))
    target.write_text(json.dumps({key: previous[key] for key in keys}, ensure_ascii=False, indent=2) + "\n")
    print("Saved", locale, len(previous), flush=True)
