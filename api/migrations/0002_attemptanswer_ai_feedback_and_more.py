from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='attemptanswer',
                    name='ai_feedback',
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='attemptanswer',
                    name='ai_suggested_marks',
                    field=models.IntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='attemptanswer',
                    name='marks',
                    field=models.IntegerField(blank=True, null=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE api_attemptanswer ADD COLUMN IF NOT EXISTS ai_feedback TEXT NULL;
                        ALTER TABLE api_attemptanswer ADD COLUMN IF NOT EXISTS ai_suggested_marks INTEGER NULL;
                        ALTER TABLE api_attemptanswer ADD COLUMN IF NOT EXISTS marks INTEGER NULL;
                    """,
                    reverse_sql="""
                        ALTER TABLE api_attemptanswer DROP COLUMN IF EXISTS ai_feedback;
                        ALTER TABLE api_attemptanswer DROP COLUMN IF EXISTS ai_suggested_marks;
                        ALTER TABLE api_attemptanswer DROP COLUMN IF EXISTS marks;
                    """,
                ),
            ],
        ),
    ]
