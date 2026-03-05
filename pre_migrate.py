"""
Pre-migration safety check.
If the core tables don't exist but migration records say 0001 was applied,
a previous failed deployment polluted the migration history.
We clear the api migration records so Django will re-run them from scratch.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'paperbot.settings')
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

try:
    tables = connection.introspection.table_names()
    print(f"Tables in database: {tables}")
except Exception as e:
    print(f"Could not inspect tables: {e}")
    raise

recorder = MigrationRecorder(connection)

# The Exam model uses db_table = 'exams' (custom name, not api_exam)
if 'exams' not in tables:
    print("Core tables are missing. Checking migration history...")
    try:
        applied = list(recorder.applied_migrations())
        api_applied = [m for m in applied if m[0] == 'api']
        if api_applied:
            print(f"Stale migration records found: {api_applied}. Clearing them.")
            recorder.migration_qs.filter(app='api').delete()
            print("Cleared stale api migration records. Django will now apply all migrations fresh.")
        else:
            print("No stale records found. Fresh database — proceeding normally.")
    except Exception as e:
        print(f"Could not check/reset migration records: {e}")
else:
    print("Core tables exist. Migration history is consistent — proceeding normally.")
