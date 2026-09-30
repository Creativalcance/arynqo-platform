# Shadow matching pilot — 30 September 2026

The evidence-v2 engine was run locally against a read-only snapshot of the current Supabase project. Candidate identifiers were replaced with run-local pseudonyms; contacts, CV references, avatars and original identifiers were excluded. Only aggregate results are retained in this report. No candidate, vacancy, match or notification was written, and no external AI request was made.

## Results

| Measure | Result |
| --- | ---: |
| Candidate profiles | 5 |
| Active vacancies | 12 |
| Candidate/vacancy combinations evaluated | 60 |
| Combinations with a stored baseline | 50 |
| Combinations without a stored baseline | 10 |
| New automatic recommendations | 0 |
| Possible matches for review | 9 |
| Low compatibility or insufficient evidence | 24 |
| Not relevant under current rules | 27 |
| Combinations with coverage below 70 | 16 |
| Combinations with mandatory skills not evidenced | 55 |

The 55 combinations include unrelated occupations; this count must not be read as 55 suitable candidates failing mandatory criteria. These are comparisons, not distinct people or vacancies. The mean new score is 20.3; the mean difference among the 50 comparable pairs is +1.8. Neither statistic establishes better matching quality.

| Stored category → new category | Count |
| --- | ---: |
| Not relevant → low compatibility | 13 |
| Low compatibility → low compatibility | 2 |
| Possible → low compatibility | 4 |
| Not relevant → not relevant | 25 |
| Possible → not relevant | 2 |
| Recommended → possible | 4 |

The ten pairs without a baseline are excluded from this transition table. Existing scores were not recalculated or replaced.

## Review of changed recommendations

All four stored recommendations moved to possible with a final score of 64. Their information coverage ranged from 83 to 92. They were capped because one or more mandatory requirements were not explicitly matched; missing general data alone was not the cause of these four transitions.

Manual inspection identified both evidence gaps (for example, budgeting) and vocabulary/quality issues (a misspelt marketing-strategy requirement and corporate versus business communication wording). These observations are not human suitability labels. Related expressions cannot all be treated as interchangeable: marketing strategy, strategic planning, campaign development and campaign management may imply different work. The engine therefore still has potential missed suitable recommendations as well as the false-positive protections covered by tests.

There are no independent recruiter labels for these 60 pairs. Precision, recall, false-positive rate, false-negative rate and hiring success probability cannot be calculated from this snapshot. No claim of improved recruitment accuracy is made. No automatic recommendations in this sample does not establish that none of the candidates are suitable.

## Decision and next validation

The draft remains unmerged. Before adoption, a recruiter/product owner must distinguish genuinely mandatory from preferred requirements in the actual vacancies and review the nine possible matches alongside a sample of low-compatibility/unrelated cases. The latter sample matters because reviewing only the highest scores would miss false negatives.

Reviewers should first assess suitability from anonymized relevant evidence without seeing the engine score, then compare their labels with its result. Labels must distinguish missing evidence from demonstrated incompatibility. Agreed equivalences can be added to the alias dictionary with regression cases; actual license, fluency or experience requirements need structured validation. Changes should be checked against a separate sample, not just the examples used to adjust the rules.

The existing `evaluate:matching` command measures precision/recall against human suitable/unsuitable labels. The new `shadow:matching` command reports aggregate category transitions and data coverage without inventing labels. Usage: `npm run shadow:matching -- /absolute/path/pseudonymized-snapshot.json`, with `candidates`, `jobs` and `previous` arrays and C1/V1-style identifiers. It runs locally and performs no writes or service requests. Private input snapshots must not be committed.

Verification executed: the shadow command evaluated all 60 pairs; TypeScript and targeted ESLint passed. The engine itself is unchanged from the previous review, whose 15 matching tests, 12 security tests and synthetic build passed. Full authenticated browser and recruiter validation remain outstanding.
