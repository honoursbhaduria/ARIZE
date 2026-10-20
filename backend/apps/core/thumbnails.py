import base64
import io

from PIL import Image

THUMB_SIZE = 480


def make_thumbnail(image_url, size=THUMB_SIZE, quality=72):
    """Return a small JPEG data URL for a base64 data URL image, or '' if not applicable."""
    if not image_url or not image_url.startswith('data:image'):
        return ''
    try:
        raw = base64.b64decode(image_url.split(',', 1)[1])
        with Image.open(io.BytesIO(raw)) as img:
            img = img.convert('RGB')
            img.thumbnail((size, size))
            out = io.BytesIO()
            img.save(out, format='JPEG', quality=quality, optimize=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(out.getvalue()).decode()
    except Exception:
        return ''
