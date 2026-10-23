"""Package the game's existing manual artwork without changing its content."""
from pathlib import Path
import argparse
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
from pypdf import PdfReader

site = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True, help='Directory containing P1.jpg through P8.jpg')
args = parser.parse_args()
source = args.source
if not all((source / f'P{number}.jpg').is_file() for number in range(1, 9)):
    parser.error(f'Manual artwork not found in {source}. Use --source to specify its location.')
target = site / 'public' / 'downloads' / 'houston-manual.pdf'
target.parent.mkdir(exist_ok=True)
pdf = canvas.Canvas(str(target), pageCompression=1)
pdf.setTitle('Houston, We Have a Problem - Instruction Manual')
pdf.setAuthor('Firefly Studio')
for number in range(1, 9):
    page = source / f'P{number}.jpg'
    with Image.open(page) as image:
        width, height = image.size
    # 144 pixels per inch, retaining each original spread's aspect ratio.
    size = (width / 2, height / 2)
    pdf.setPageSize(size)
    pdf.drawImage(ImageReader(str(page)), 0, 0, width=size[0], height=size[1])
    pdf.showPage()
pdf.save()
assert len(PdfReader(target).pages) == 8
print(f'{target}: 8 original spreads, {target.stat().st_size} bytes')

