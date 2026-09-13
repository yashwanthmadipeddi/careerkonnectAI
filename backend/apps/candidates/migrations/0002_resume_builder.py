from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('candidates', '0001_initial')]

    operations = [
        migrations.AddField(model_name='candidate', name='target_job_title', field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name='candidate', name='career_objective', field=models.TextField(blank=True)),
        migrations.AddField(model_name='candidate', name='languages', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='candidate', name='achievements', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='candidate', name='preferred_location', field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name='candidate', name='work_preference', field=models.CharField(blank=True, max_length=30)),
        migrations.AddField(model_name='candidate', name='generated_resume_text', field=models.TextField(blank=True)),
        migrations.AddField(model_name='candidate', name='resume_generated_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='education', name='education_level', field=models.CharField(blank=True, max_length=40)),
        migrations.AddField(model_name='education', name='coursework', field=models.TextField(blank=True)),
        migrations.AddField(model_name='education', name='achievements', field=models.TextField(blank=True)),
    ]
