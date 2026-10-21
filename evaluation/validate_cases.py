#!/usr/bin/env python3
"""Validate the evaluation catalog structure; this is not an AI/RAG runner."""
import json
from collections import Counter
from pathlib import Path
import sys

path = Path(__file__).with_name("cases.json")
try:
    payload = json.loads(path.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"FAIL: cannot read valid JSON: {exc}")
    raise SystemExit(1)

cases = payload.get("cases")
required = payload.get("required_categories", {})
if not isinstance(cases, list):
    print("FAIL: 'cases' must be a list")
    raise SystemExit(1)
ids = [c.get("id") for c in cases if isinstance(c, dict)]
if len(ids) != len(cases) or any(not x for x in ids):
    print("FAIL: each case must be an object with an id")
    raise SystemExit(1)
if len(set(ids)) != len(ids):
    print("FAIL: case IDs are not unique")
    raise SystemExit(1)
for case in cases:
    missing = [key for key in ("category", "question", "fixture", "expected_behavior", "checks") if key not in case]
    if missing:
        print(f"FAIL: {case.get('id')} missing {missing}")
        raise SystemExit(1)
counts = Counter(c["category"] for c in cases)
errors = []
for category, expected_count in required.items():
    if counts.get(category, 0) != expected_count:
        errors.append(f"{category}: expected {expected_count}, found {counts.get(category, 0)}")
if len(cases) < 12:
    errors.append(f"need at least 12 cases, found {len(cases)}")
if errors:
    print("FAIL: evaluation catalog does not meet its declared requirements")
    print("\n".join(f"- {error}" for error in errors))
    raise SystemExit(1)
print(f"PASS: {len(cases)} unique evaluation cases")
for category, expected_count in required.items():
    print(f"PASS: {category}: {counts[category]}/{expected_count}")
print("NOTE: this validates the catalog only; it does not run the model or retrieval pipeline.")
