import os

from dotenv import load_dotenv
from PIL import Image

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WATERMARK_PATH = os.path.join(BASE_DIR, "WM_UFT.png")
IMAGE_QUALITY = int(os.getenv("IMAGE_QUALITY", 50))


def watermarking(img_path: str):
    watermark_uft = Image.open(WATERMARK_PATH)
    with Image.open(img_path) as image:
        image.convert("RGBA")
        image.paste(
            im=watermark_uft,
            box=(100, (image.size[1] - watermark_uft.size[1]) - 100),
            mask=watermark_uft,
        )
        image.save(img_path)


def converting_to_webp(img_path: str) -> str:
    with Image.open(img_path) as image:
        image.convert("RGBA")
        new_img_path = img_path.split(".")[0] + ".webp"
        image.save(new_img_path, "webp", optimize=True, quality=IMAGE_QUALITY)
        try:
            os.remove(img_path)
        except OSError as exc:
            print(f"Error: {exc.strerror}")
        return new_img_path
