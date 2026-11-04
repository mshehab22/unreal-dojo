# Turns a list of PNG screenshots with captions into one looping GIF. Needs Python 3 with Pillow (pip install pillow); the repo adds no dependency for it (A1850).
# Usage: python framesToGif.py <manifest.json> <output.gif>. The manifest is a list of {"file": <png path>, "caption": <text>, "holdMilliseconds": <number>}.
import json
import sys

from PIL import Image, ImageDraw, ImageFont

OUTPUT_WIDTH = 960
CAPTION_HEIGHT = 44
CAPTION_FONT_SIZE = 22
PALETTE_COLORS = 256


# Draws the caption on a dark bar along the bottom of the frame.
def add_caption(frame, caption, font):
    draw = ImageDraw.Draw(frame)
    top = frame.height - CAPTION_HEIGHT

    draw.rectangle((0, top, frame.width, frame.height), fill=(14, 16, 22))
    draw.text((16, top + (CAPTION_HEIGHT - CAPTION_FONT_SIZE) // 2 - 2), caption, fill=(236, 238, 244), font=font)


# Loads one screenshot, scales it to the output width, and adds its caption.
def build_frame(entry, font):
    picture = Image.open(entry["file"]).convert("RGB")
    height = round(picture.height * OUTPUT_WIDTH / picture.width)
    picture = picture.resize((OUTPUT_WIDTH, height), Image.LANCZOS)

    add_caption(picture, entry["caption"], font)

    return picture


# Reads the manifest and writes the GIF, each frame with its own adaptive palette so UI colours stay clean.
def main():
    manifest_path, output_path = sys.argv[1], sys.argv[2]

    with open(manifest_path, encoding="utf-8") as handle:
        entries = json.load(handle)

    font = ImageFont.load_default(size=CAPTION_FONT_SIZE)
    frames = [build_frame(entry, font).quantize(colors=PALETTE_COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for entry in entries]
    durations = [int(entry["holdMilliseconds"]) for entry in entries]

    frames[0].save(output_path, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=1)


main()
