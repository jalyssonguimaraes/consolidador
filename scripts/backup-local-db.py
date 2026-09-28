"""Create a consistent SQLite backup and lossless JSON export (including WAL data).
Run from the repository root. Outputs are private, ignored by Git.
"""
import datetime
import hashlib
import json
import pathlib
import sqlite3

root = pathlib.Path(__file__).resolve().parents[1]
destination = root / 'outputs' / 'backups' / datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
destination.mkdir(parents=True, exist_ok=False)
found = False
for path in (root / '.wrangler/state/v3/d1').rglob('*.sqlite'):
    if path.name == 'metadata.sqlite':
        continue
    with sqlite3.connect(path.as_uri() + '?mode=ro', uri=True) as source:
        tables = {r[0] for r in source.execute("select name from sqlite_master where type='table'")}
        if 'notes' not in tables:
            continue
        if found:
            raise RuntimeError('More than one portfolio database found; select the source explicitly.')
        found = True
        with sqlite3.connect(destination / 'portfolio.sqlite') as target:
            source.backup(target)
        records = {}
        for table in ['notes', 'revisions', 'quotes', 'asset_events']:
            if table in tables:
                cursor = source.execute('select * from ' + table)
                columns = [c[0] for c in cursor.description]
                records[table] = [dict(zip(columns, row)) for row in cursor.fetchall()]
        output = destination / 'portfolio.json'
        output.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
        manifest = {'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'source': str(path.relative_to(root)),
                    'counts': {table: len(rows) for table, rows in records.items()},
                    'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
        (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        print(json.dumps({'backup': str(destination), **manifest}, ensure_ascii=False))
if not found:
    raise RuntimeError('No portfolio database found. No data was exported.')
