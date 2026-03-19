#!/usr/bin/env python3
"""Validate tree-sitter query files against the generated grammar.

Checks that all node type references in .scm files exist in node-types.json.
Run: python3 test-queries.py
"""

import json
import re
import sys
from pathlib import Path


def load_valid_node_types(node_types_path: str) -> set[str]:
    with open(node_types_path) as f:
        node_types = json.load(f)
    names = set()
    for nt in node_types:
        names.add(nt["type"])
        for child in nt.get("children", {}).get("types", []):
            names.add(child["type"])
        for field_info in nt.get("fields", {}).values():
            for t in field_info.get("types", []):
                names.add(t["type"])
    return names


def extract_node_refs(scm_path: str) -> set[str]:
    with open(scm_path) as f:
        content = f.read()
    refs = set(re.findall(r"\(([a-z_][a-z0-9_]*)\)", content))
    refs -= {"ERROR"}  # tree-sitter builtin
    return refs


def main():
    root = Path(__file__).parent
    valid = load_valid_node_types(root / "src" / "node-types.json")
    errors = 0

    for scm in sorted((root / "queries").glob("*.scm")):
        refs = extract_node_refs(str(scm))
        missing = refs - valid
        if missing:
            print(f"FAIL {scm.name}: {len(missing)} invalid node types:")
            for m in sorted(missing):
                print(f"  - {m}")
            errors += len(missing)
        else:
            print(f"OK   {scm.name}: {len(refs)} references valid")

    if errors:
        print(f"\n{errors} errors found")
        sys.exit(1)
    print("\nAll query files valid")


if __name__ == "__main__":
    main()
