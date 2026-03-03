from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_attemptanswer_ai_feedback_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='exam',
                    name='available_days',
                    field=models.IntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='exam',
                    name='published_at',
                    field=models.DateTimeField(blank=True, null=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE api_exam ADD COLUMN IF NOT EXISTS available_days INTEGER NULL;
                        ALTER TABLE api_exam ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE NULL;
                    """,
                    reverse_sql="""
                        ALTER TABLE api_exam DROP COLUMN IF EXISTS available_days;
                        ALTER TABLE api_exam DROP COLUMN IF EXISTS published_at;
                    """,
                ),
            ],
        ),
    ]
