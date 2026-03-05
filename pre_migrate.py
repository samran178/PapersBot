"""
Pre-migration safety check.

Handles two production scenarios:
1. Core api tables missing but migration records exist (stale records from a failed
   deployment) — clears api migration records so Django re-applies them fresh.
2. Django framework tables exist in a post-migration state but intermediate migrations
   are not recorded — fakes those migrations so Django doesn't try to re-apply them.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'paperbot.settings')
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder


def get_tables():
    return connection.introspection.table_names()


def get_columns(table):
    try:
        return [col.name for col in connection.introspection.get_table_description(
            connection.cursor(), table
        )]
    except Exception:
        return []


def is_applied(recorder, app, name):
    return (app, name) in recorder.applied_migrations()


def fake_migration(recorder, app, name):
    recorder.record_applied(app, name)
    print(f"  Faked: {app}.{name}")


tables = get_tables()
print(f"Tables in database: {tables}")

recorder = MigrationRecorder(connection)

# ── 1. api tables missing but recorded ────────────────────────────────────────
if 'exams' not in tables:
    print("Core api tables are missing. Checking for stale migration records...")
    api_applied = [m for m in recorder.applied_migrations() if m[0] == 'api']
    if api_applied:
        print(f"  Clearing stale records: {api_applied}")
        recorder.migration_qs.filter(app='api').delete()
        print("  Done — Django will recreate tables from scratch.")
    else:
        print("  No stale records. Fresh database — proceeding normally.")
else:
    print("Core api tables exist — OK.")

# ── 2. contenttypes schema already in post-0002 state ─────────────────────────
# contenttypes.0002_remove_content_type_name drops the 'name' column.
# If the table exists but 'name' is already absent, the migration must be faked.
if 'django_content_type' in tables:
    ct_cols = get_columns('django_content_type')
    print(f"django_content_type columns: {ct_cols}")

    if 'name' not in ct_cols:
        # Table is already in the post-0002 state; fake both migrations if needed.
        if not is_applied(recorder, 'contenttypes', '0001_initial'):
            fake_migration(recorder, 'contenttypes', '0001_initial')
        if not is_applied(recorder, 'contenttypes', '0002_remove_content_type_name'):
            fake_migration(recorder, 'contenttypes', '0002_remove_content_type_name')
    else:
        print("  django_content_type has 'name' column — 0002 will run normally.")

# ── 3. sessions table already exists ──────────────────────────────────────────
if 'django_session' in tables:
    if not is_applied(recorder, 'sessions', '0001_initial'):
        print("django_session exists but 0001_initial not recorded — faking it.")
        fake_migration(recorder, 'sessions', '0001_initial')

print("Pre-migration check complete.")
