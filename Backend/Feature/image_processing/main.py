import os

from PIL import Image, ImageDraw, ImageFile

watermark_UFT = Image.open("Backend/Feature/image_processing/WM_UFT.png")

def watermarking(img_path:str):
    """
        Put a watermark on the existing image in the bottom left and save it

        **img_path** variable is the image directory that want to be put watermark on it
    """
    with Image.open(img_path) as im:
        im.paste(im=watermark_UFT,box=(100,(im.size[1]-watermark_UFT.size[1])-100),mask=watermark_UFT)
        im.save(img_path)
        
def converting_to_webp(img_path:str) -> str:
    """
        Converting and compressing an image to .webp format and save it

        **img_path** variable is the image directory that want to be converted
    """
    with Image.open(img_path) as im:
        im.convert('RGB')
        new_img_path = img_path.split('.')[0] + '.webp'
        im.save(new_img_path,'webp',optimize=True, quality=1)
        try:
            os.remove(img_path)
        except OSError as e:
            print(f"Error: {e.strerror}")
        return new_img_path