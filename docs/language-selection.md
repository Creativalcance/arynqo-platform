# Country-assisted language selection

Shared `LanguagePicker` supplies candidates and company vacancy forms. Country flags and localized country names narrow the available language choices. Selecting a country never adds a language automatically and never changes residence or nationality. “All languages” retains access to the full existing catalog, including minority/sign languages and historical values.

The stored format stays unchanged: Portuguese canonical language label, optional CEFR/native level, and the existing spoken/written field or prefix. Country selection is not persisted and is not a matching parameter. Selecting the same language through another country updates the same language entry rather than duplicating it. Existing values are retained until explicitly edited or removed.

Country-language suggestions derive from Unicode CLDR 48 territoryInfo (Unicode 16), downloaded 2026-10-06 from https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-core/supplemental/territoryInfo.json. Entries with an official-status attribute are used where available; otherwise recorded languages are used. Script variants resolve to the existing base language codes. Countries with no mapped entry fall back to the full catalog. This is a navigation aid, not a declaration of current legal language status.

License: `lib/data/UNICODE-LICENSE.txt`. No runtime external request or new package is needed.
