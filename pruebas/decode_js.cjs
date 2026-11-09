// uso: node decode_js.cjs <png> → texto jsQR
const fs=require('fs'),{PNG}=require('pngjs'),jsQR=require('jsqr');
const p=PNG.sync.read(fs.readFileSync(process.argv[2]));const r=jsQR(new Uint8ClampedArray(p.data),p.width,p.height);
console.log(JSON.stringify({jsqr:r?r.data:null}));
