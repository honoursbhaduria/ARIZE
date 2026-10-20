from django.db import migrations


def backfill(apps, schema_editor):
    from apps.core.thumbnails import make_thumbnail

    ProgressPhoto = apps.get_model('core', 'ProgressPhoto')
    for photo in ProgressPhoto.objects.filter(thumbnail='').iterator(chunk_size=20):
        thumb = make_thumbnail(photo.image_url)
        if thumb:
            photo.thumbnail = thumb
            photo.save(update_fields=['thumbnail'])


class Migration(migrations.Migration):
    dependencies = [('core', '0007_progressphoto_thumbnail')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
