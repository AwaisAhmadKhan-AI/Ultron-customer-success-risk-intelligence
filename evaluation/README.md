# Evaluation Catalog

`cases.json` defines the assessment's required 12 cases. Fixtures are synthetic and should be loaded into a dedicated test database, with two CSM users whose account assignments differ.

## Validate catalog structure

From the repository root:

```bash
python evaluation/validate_cases.py
```

This script validates JSON shape and required category counts only. It does **not** execute retrieval, call the LLM, measure latency or determine answer correctness.

## Run the actual evaluation

Run each case through the live application and record the observed result in `results_template.csv`. Keep the same provider/configuration and record whether network/provider time is included. A case is not `PASS` simply because the expected behavior is written in the catalog. Use source IDs from actual retrieval and verify citations against them.

Record at least:

- retrieval success for cases with expected retrievable sources;
- citation validity and account ownership;
- supported-answer correctness and correct no-answer behavior;
- latency and token/cost fields when provider usage metadata exists;
- any security/data-leakage failures.

Do not place real customer data, passwords, tokens or API keys in this dataset.
