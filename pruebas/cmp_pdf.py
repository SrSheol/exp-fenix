# uso: cmp_pdf.py <orig.pdf> <nuevo.pdf> → JSON: hojas, tamaños y hojas cuyo texto difiere (los dígitos se enmascaran: las hojas 66, 74,
# 96 y 106 llevan números al azar por diseño)
import sys, json, re, pymupdf
a, b = pymupdf.open(sys.argv[1]), pymupdf.open(sys.argv[2])
norm = lambda t: re.sub(r'\d', '#', re.sub(r'\s+', ' ', t)).strip()
dif = []
for i in range(min(a.page_count, b.page_count)):
    if norm(a[i].get_text()) != norm(b[i].get_text()):
        dif.append(i + 1)
tam = all(abs(a[i].rect.width - b[i].rect.width) < 0.5 and abs(a[i].rect.height - b[i].rect.height) < 0.5 for i in range(min(a.page_count, b.page_count)))
print(json.dumps({'n_orig': a.page_count, 'n_nuevo': b.page_count, 'tamanos_iguales': tam, 'texto_distinto': dif}))
