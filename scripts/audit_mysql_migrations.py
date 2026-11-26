"""Inventory the journaled MySQL schema without connecting to a database."""

import argparse
from collections import Counter
import json
from pathlib import Path


def inventory(migrations: Path) -> dict:
    meta = migrations / "meta"
    journal = json.loads((meta / "_journal.json").read_text(encoding="utf-8"))
    entries = journal["entries"]
    if journal["dialect"] != "mysql" or not entries:
        raise ValueError("Expected a nonempty MySQL migration journal")

    tags = [entry["tag"] for entry in entries]
    timestamps = [entry["when"] for entry in entries]
    if len(tags) != len(set(tags)) or timestamps != sorted(set(timestamps)):
        raise ValueError("Migration tags and timestamps must be unique and ordered")
    if [entry["idx"] for entry in entries] != list(range(len(entries))):
        raise ValueError("Migration indexes must be consecutive and start at zero")

    files = {file.stem for file in migrations.glob("*.sql")}
    missing = sorted(set(tags) - files)
    if missing:
        raise ValueError(f"Missing journaled SQL files: {', '.join(missing)}")

    snapshot_file = meta / f"{entries[-1]['idx']:04d}_snapshot.json"
    snapshot = json.loads(snapshot_file.read_text(encoding="utf-8"))
    if snapshot["dialect"] != "mysql":
        raise ValueError("Expected a MySQL schema snapshot")

    column_types = Counter()
    auto_updated = []
    foreign_keys = {}
    for name, table in sorted(snapshot["tables"].items()):
        foreign_keys[name] = sorted(table["foreignKeys"])
        for column in table["columns"].values():
            column_types[column["type"].split("(", 1)[0]] += 1
            if column.get("onUpdate"):
                auto_updated.append(f"{name}.{column['name']}")

    return {
        "snapshot": snapshot_file.name,
        "journaled_migrations": tags,
        "unjournaled_migrations": sorted(files - set(tags)),
        "table_count": len(foreign_keys),
        "column_types": dict(sorted(column_types.items())),
        "auto_updated_columns": auto_updated,
        "foreign_keys": foreign_keys,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--migrations", type=Path, default=Path(__file__).resolve().parents[1] / "drizzle")
    args = parser.parse_args()
    try:
        report = inventory(args.migrations)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Migration audit failed: {error}\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
