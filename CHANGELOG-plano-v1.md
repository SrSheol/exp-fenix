# CHANGELOG — exp-fenix · Plano v1 (2026-10-01)

Base: `index.html` v7 (`cd4cb5a`). Sigue siendo un solo `index.html` para GitHub Pages. **No se tocó el motor NOM-020 (`FXEngine`), `FX_ASSETS` ni `FXLev`**: los bloques son idénticos byte por byte a v7, por eso no va `kit/`. Sin deploy.

## Navegación

| Dónde | Qué |
|---|---|
| Barra superior | **Levantamiento \| Plano \| Expediente**. En pantallas angostas, solo íconos. |
| `#plano` | Abre la vista. Se recuerda en `fenixmex-vista` igual que las otras. |
| `#levantamiento`, `#s-*`, `irA()` | Sin cambio de comportamiento. `irA()` y los enlaces `#s-*` regresan al Expediente desde Levantamiento **o** desde Plano. |

## Vista Plano

Hay un plano por equipo; se elige en el selector de la barra.

**Tarjetas de captura:**
- **Geometría:** plantilla H/V, Ø interior, longitud soldadura–soldadura, profundidad de tapa y **ceja recta**.
- **Diseño:** S, E, factor de seguridad, radiografiado, corrosión, National Board, fabricante, tipo de boquilla y código de fabricación.
- **Dispositivo de relevo:** C, K, M y área de descarga instalada.
- **Cajetín:** dibujó y fecha del plano.

**Del expediente (solo lectura):** cada dato tiene un botón **Editar** que lleva a su campo.

**Memoria de cálculo en vivo:**
- Muestra fórmula → sustitución → resultado.
- Verifica espesor empleado contra requerido y área instalada contra calculada.
- Si la Pm calculada no coincide con la del expediente, ofrece el botón **«Usar Pm en el expediente»**. Es una acción explícita; nunca se copia sola.

**Pendientes:** un aviso lista cada entrada faltante y lleva al campo, sea del Plano, del Expediente o de las PND.

**Vista previa y exportación:**
- La vista previa de la hoja es SVG.
- **Exportar Plano PDF** genera `PLANO <TAG> <CLIENTE>.pdf`.
- **SVG** descarga la misma hoja en vector.
- Si faltan datos, se pide confirmación antes de exportar. El PDF sale con «—» y una línea roja «DATOS PENDIENTES».

### Hoja (PDF/SVG)

Tamaño tabloide (17 × 11 in), con marco y zonas 1–8 / A–D.

| Plantilla | Croquis | Memoria |
|---|---|---|
| **H** | VISTA FRONTAL (croquis del levantamiento con boquillas, L, tapas y Ø INT. en mm) + VISTA LATERAL (polar 0–315°, sillas) | 3 columnas abajo |
| **V** | VISTA SUPERIOR + VISTA FRONTAL a la izquierda | 2 columnas al centro |

La columna derecha es igual en ambas plantillas:
- **ESPECIFICACIONES**, con las etiquetas del plano.
- **TABLA DE BOQUILLAS:** ITEM / TIPO / CANTIDAD / Ø mm / SERVICIO, con Ø en pulgadas × 25.4.
- **NOTAS** a), b) y c), exactas.
- **Cajetín Corporativo Fenixmex:**
  - Cliente y domicilio.
  - EQUIPO, TAG, DIBUJO y REVISO.
  - ESCALA S/E, ACOTACIÓN mm y FECHA.
  - PLANO (código de memoria).
  - Firma y cédula del firmante izquierdo, y logo.

La memoria incluye nomenclatura, la tabla auxiliar ENVOLVENTE / TAPA-ELIPTICA y las secciones 1–5. Las fracciones se dibujan apiladas y el radical en vector, porque la fuente no trae √ ni π; por eso π se escribe 3.1416, como en el plano. La fuente es Liberation Sans de `FX_ASSETS`.

## Captura vs cálculo

**Se captura (nunca se inventa):**

| Entrada | De dónde |
|---|---|
| Cliente, domicilio, equipo, TAG, ubicación, marca, serie, año | Expediente |
| Fluido, P diseño, P calibración, P operación, T diseño, T operación, capacidad, hidrostática, materiales | Expediente |
| Ø válvula | Expediente; si está vacío, la boquilla VÁLVULA DE SEGURIDAD del levantamiento |
| Espesor empleado | Mínimo capturado de `espEnv` para el cuerpo; mínimo de `espSup` ∪ `espInf` para las tapas |
| Ø, L, profundidad de tapa | Equipo, que llena el levantamiento al importar; si está vacío, `equipo.levantamiento.dimensiones` |
| Plantilla H/V | `equipo.plano.orientacion`; si está vacía, la orientación del levantamiento |
| **S**, **C.R.** | Plano, a mano. **No hay tabla de materiales.** |
| **E** | Plano; **0.85 por omisión**. Se guarda como fracción; si se escribe 85 se toma como 85 % |
| C / K / M | Plano. Si el fluido es AIRE y están vacíos: 356.00 / 0.876 / 28.97. Con otro fluido, quedan pendientes |
| Área instalada | Plano; si está vacía, se calcula como círculo del Ø de válvula (0.7854 · d²) |
| Número de plano | `codigoMemoriaCalculo` (RSP-020-XXX-2026) |
| Revisó / firma / cédula | Firmante izquierdo (globales) |

Si falta una entrada, el resultado queda en «—» y la entrada se marca **Pendiente**. Nunca se usan números de Coyote o Tucanes.

**Se calcula** (constantes en `FXPlano`: `PI_P=3.1416`, `K_FORMA=1.00`, `T_ABS=273`, `N_TAPAS=2`):

| Sección | Fórmula |
|---|---|
| 1.1 | t = P R / (S E − 0.6 P) |
| 1.2 | t = P D K / (2 S E − 0.2 P), con K = 1.00 |
| 2.1 | Pm = S E t / (R + 0.6 t), t empleado |
| 2.2 | Pm = 2 S E t / (K D + 0.2 t). La especificación PRES. TRAB. MAX. PERM. toma el menor de los dos Pm |
| 3 | A_env = 3.1416 D L · A_tapas = (1.09 D² + 3.1416 D · C.R.) × 2 · total |
| 4 | V_env = 0.7854 D² L · V_tapas = (0.1309 D³ + 0.785 D² · C.R.) × 2 · total |
| 5 | Wa = 0.029 · V_total · 62.42 · W = Wa · 73.596 · P = Pc × 1.1 + 1.033 · T = °C + 273 · **A = W / (C K P) · √(T / M)** |
| Conclusión | Texto del plano, con «>» o «≤» según área instalada vs calculada |

Unidades: P y S en kg/cm²; R, D y t en mm para UG-27 y Pm; D, L y C.R. en m para área y volumen.

## Esquema añadido

`equipo.plano` (default de `FXPlano.DEF`, aplicado por `migrar()`):

```
orientacion '', cejaRectaMm '', esfuerzoPermisible '', eficiencia '0.85', factorSeguridad '',
radiografiado '', corrosionMm '', nationalBoard '', fabricante '', codigoFabricacion 'ASME BPVC SEC. VIII. DIV. 1',
tipoConexion 'COPLE', relevoC '', relevoK '', relevoM '', areaValvulaCm2 '', dibujo '', fecha ''
```

- Viaja en el borrador (IndexedDB) y en Exportar/Importar `{version, draft, imgs}`. No hay Firebase para el plano.
- Las vistas Plano y Expediente comparten `diametroInteriorCm`, `longitudMm` y `profundidadTapaMm`, que ya existían desde levantamiento v1.
- `equipoVirgen()`: un equipo con datos de plano capturados ya no se reutiliza al importar.

## Importación

Usa la misma ruta que v7: la primera importación llena el equipo en blanco y las siguientes agregan; la razón social solo se llena si está vacía; la capacidad se normaliza a m³; los espesores 1–16 van 1:1; después corre `migrar()`.

El Plano lee el equipo y su `levantamiento`, incluidas boquillas con posición, así que se llena solo. Lo que el levantamiento no trae (S, C.R., temperaturas distintas al default) queda pendiente.

## Autoprueba con las muestras (Node, mismo código que la app)

| | t env / tapas | Pm env / tapas | A tot (m²) | V tot (m³) | W | **A desfogue** | Conclusión |
|---|---|---|---|---|---|---|---|
| H Coyote | 2.82 / 2.81 ✓ | 20.16 / 20.32 ✓ | 3.740 ✗* | 0.4999 ✓ | 66.60 (≈66.59) | **0.0505 ✓** | idéntica ✓ |
| V Tucanes | 2.12 / 2.12 ✓ | 20.26 / 20.89 ✓ | 3.740 ✗* | 0.4999 ✓ | 66.59 ✓ | **0.0706 ✓** | idéntica ✓ |

Notas de la autoprueba:

1. \* **Área de tapas.** El DWG imprime 1.826 / 2.014 m², que es **exactamente el doble** de su propia fórmula `(1.09 D² + π D C.R.) × 2`: 0.913 / 1.007. Por eso su total es 4.653 / 4.748 y aquí sale 3.740. Se implementó la fórmula tal cual, sin inventar el factor. El volumen sí cuadra con × 2. **Juan debe confirmar.** Si el plano firmado debe repetir el valor del DWG, el cambio es una constante.
2. **Temperatura absoluta.** El DWG imprime T = 328.15 / 505.15 K (+273.15). Aquí se usa **+273**, como dice la nomenclatura del plano. A no cambia a 4 decimales.
3. **W en Coyote.** 66.60 contra 66.59 es redondeo intermedio del DWG. A no cambia.
4. **Válvula de Tucanes.** El área de 0.110 cm² no es el círculo de Ø 6 mm (que daría 0.283). Se captura en «Área de descarga instalada».
5. Los valores de muestra **no** están en el código de producción; solo en la prueba.

## Pruebas

- **Regresión NOM-020 (Chromium, azar y fecha fijos), Cargar ejemplo → Generar, v7 contra este parche:** PDF **idéntico byte por byte** (109 hojas). También idéntico con datos de Plano capturados (S, C.R., FS, plantilla V…), es decir, el motor ignora `equipo.plano`.
- **Bloques sin cambio** (comparados): FXLev, FXEngine, FX_ASSETS, pdf-lib, fontkit.
- **Chromium (Firebase bloqueado), sin errores de página:**
  - Orden de pestañas.
  - Plano vacío con 9 pendientes.
  - Importar H y luego V: 2 equipos y selector.
  - Capturar S y C.R.: memoria completa.
  - Exportar PDF y SVG.
  - Recargar: persisten vista y datos.
  - **Editar** lleva al campo del expediente.
  - Exportar/Importar borrador conserva `plano`.
  - Levantamiento sigue exportando PDF.
  - Pantallas de 1440 px y 390 px.

## Fuera de alcance (sin cambios)

- DWG o DXF en el navegador.
- S desde tablas de materiales.
- Fluido y temperaturas en el levantamiento.
- Tipos de boquilla nuevos.
- Hojas 6, 23, 66, 94, 96, 106 y demás.
- Firmas, glyphs, SA-414-G, hidrostática = diseño × 1.1, máscara de memoria, RFC de 12, nombres de archivo, Firebase solo para globales, tema `fenixmex-theme`.
- Nuevo expediente sigue limpiando igual.
- Deploy.
