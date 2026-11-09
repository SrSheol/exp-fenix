# uso: stress.py <png> <prefijo_salida> → por variante: zxing ok?, opencv ok?, y guarda PNG para jsQR
import sys, json, cv2, numpy as np, zxingcpp
src, pre = sys.argv[1], sys.argv[2]
im = cv2.imread(src); h, w = im.shape[:2]
pad = cv2.copyMakeBorder(im, 60, 60, 60, 60, cv2.BORDER_CONSTANT, value=(255,255,255))
def jpeg(x, q): return cv2.imdecode(cv2.imencode('.jpg', x, [cv2.IMWRITE_JPEG_QUALITY, q])[1], 1)
def rot(x, a):
    H, W = x.shape[:2]; M = cv2.getRotationMatrix2D((W/2, H/2), a, 1); return cv2.warpAffine(x, M, (W, H), borderValue=(255,255,255))
def persp(x, k):
    H, W = x.shape[:2]; s = np.float32([[0,0],[W,0],[W,H],[0,H]]); d = np.float32([[W*k,H*k*0.5],[W*(1-k*0.3),0],[W,H],[0,H*(1-k)]])
    return cv2.warpPerspective(x, cv2.getPerspectiveTransform(s, d), (W, H), borderValue=(255,255,255))
def luz(x):
    H, W = x.shape[:2]; g = np.tile(np.linspace(0.55, 1.0, W), (H, 1))[..., None]; return (x * g).astype(np.uint8)
def ruido(x): return np.clip(x + np.random.default_rng(1).normal(0, 14, x.shape), 0, 255).astype(np.uint8)
V = {'base': pad, 'blur': cv2.GaussianBlur(pad, (0,0), 1.2), 'jpeg30': jpeg(pad, 30), 'rot17': rot(pad, 17),
     'persp': persp(pad, 0.12), 'luz': luz(pad), 'ruido': ruido(pad),
     'mezcla': jpeg(ruido(luz(cv2.GaussianBlur(rot(persp(pad, 0.08), 9), (0,0), 0.9))), 45),
     'chico': cv2.resize(pad, None, fx=0.62, fy=0.62, interpolation=cv2.INTER_AREA)}
out = {}
det = cv2.QRCodeDetector()
for k, x in V.items():
    cv2.imwrite(f'{pre}_{k}.png', x)
    z = [r.text for r in zxingcpp.read_barcodes(x)]
    try: o = det.detectAndDecode(x)[0]
    except Exception: o = ''
    out[k] = {'zxing': bool(z), 'opencv': bool(o)}
print(json.dumps(out))
