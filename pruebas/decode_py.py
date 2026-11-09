# uso: decode_py.py <pdf> <pagina(1..)> <dpi> <salida.png> [x0 y0 x1 y1 en pt, recorte]  → imprime JSON con zxing y opencv
import sys, json, pymupdf, zxingcpp, cv2, numpy as np
pdf, pg, dpi, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
d = pymupdf.open(pdf); p = d[pg-1]
clip = pymupdf.Rect(*map(float, sys.argv[5:9])) if len(sys.argv) >= 9 else None
pix = p.get_pixmap(dpi=dpi, clip=clip); pix.save(out)
img = cv2.imread(out)
z = [r.text for r in zxingcpp.read_barcodes(img)]
det = cv2.QRCodeDetector(); v, pts, _ = det.detectAndDecode(img)
print(json.dumps({"zxing": z, "opencv": v, "px": [pix.width, pix.height]}))
