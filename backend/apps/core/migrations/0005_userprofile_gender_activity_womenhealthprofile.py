from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_alter_progressphoto_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='activity_level',
            field=models.CharField(choices=[('sedentary', 'Sedentary'), ('moderate', 'Moderate'), ('heavy', 'Heavy')], default='moderate', max_length=16),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='gender',
            field=models.CharField(choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], default='other', max_length=16),
        ),
        migrations.CreateModel(
            name='WomenHealthProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cycle_length_days', models.PositiveIntegerField(blank=True, null=True)),
                ('period_duration_days', models.PositiveIntegerField(blank=True, null=True)),
                ('last_period_date', models.DateField(blank=True, null=True)),
                ('cycle_regularity', models.CharField(choices=[('regular', 'Regular'), ('irregular', 'Irregular')], default='regular', max_length=16)),
                ('mood_pattern', models.CharField(blank=True, max_length=120)),
                ('behavior_notes', models.TextField(blank=True)),
                ('symptoms', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='women_health_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
