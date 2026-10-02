# CHANGELOG — exp-fenix · Plano v2 (2026-10-01)

Base: Plano v1 (`2b44427`). Sigue siendo un solo `index.html` para GitHub Pages. **No se tocó el motor NOM-020 (`FXEngine`), `FX_ASSETS`, pdf-lib, fontkit, JSZip ni ExcelJS** (bloques idénticos byte por byte), por eso no va `kit/`. Sin deploy.

## Hoja del plano (PDF / SVG) — libertad de diseño

Misma arquitectura del CAD (croquis + especificaciones + boquillas + memoria + notas + cajetín), sin huecos:

| Bloque | Cambio |
|---|---|
| Columna derecha | ESPECIFICACIONES → BOQUILLAS → CROQUIS DE UBICACIÓN → NOTAS → CAJETÍN reparten toda la altura. El croquis de ubicación toma lo que sobra (mínimo 64 pt; si hay muchas boquillas, los renglones se compactan). Sin croquis de ubicación, los renglones crecen y el resto se reparte entre bloques. |
| Memoria de cálculo | La letra se ajusta sola (5.6–8.8 pt) para llenar las columnas (3 en H, 2 en V) y cada columna se justifica. Una fórmula que no cabe a lo ancho se reduce solo ella. |
| Vista frontal | Cotas CAD dentro del croquis: **R INT.** (eje → pared, junto a Ø INT.), **ESP. MIN.** en tapa izquierda/derecha (o superior/inferior) y en el cuerpo, con marca en la pared. Sustituye el bloque de texto de v1. |
| Vista lateral (H) / superior (V) | Letras de boquillas por ángulo (ver Boquillas). La etiqueta de ángulo que queda bajo una boquilla se omite. |
| Cajetín | Igual que v1, 4 pt más compacto. |

## Captura vs vinculado (gris)

En la vista Plano los campos **blancos** se capturan y los **grises** (`caja auto` + candado + etiqueta «vinculado») son de solo lectura y se recalculan:

| Gris (vinculado) | Regla |
|---|---|
| Radio interior R | D / 2 |
| Volumen calculado | V env + V tapas |
| Pres. trab. máx. perm. | min(Pm env, Pm tapas) → **también en el expediente** |
| Prueba hidrostática | diseño × 1.1 |
| Capacidad en el plano | volumen calculado (3 decimales); si no está completo, la de placa |
| Espesor empleado cuerpo / tapas | mínimo de la PND (botón «Editar en PND») |
| Área de desfogue calculada | §5 |

Captura en el plano: Ø, L, profundidad de tapa, **C.R.**, fluido, P diseño / calibración / operación, T diseño / operación, capacidad de placa, **S** (sin tabla de materiales), **E** (0.85 por omisión), materiales, FS, radiografiado, corrosión, fabricante, marca, serie, año, NB, ubicación, código de fabricación, Ø válvula, C/K/M, área instalada, razón social, domicilio, nombre del equipo, TAG, plano No. (RSP-020-XXX-2026), dibujó, fecha.

Junto a «Capacidad de placa» se compara con el volumen calculado (✓ si difiere < 0.5 %; si no, el % para ajustar L o C.R.).

## Sincronía Plano ↔ Expediente

Los dos lados escriben **el mismo campo del equipo** (`e[k]`) o del borrador (`D[k]`); no hay copias que se desfasen. Solo se escribe la llave editada: nunca se vacía otra.

| Plano | Expediente |
|---|---|
| Razón social, domicilio | `razonSocialPropietario` (+ `razonSocialUsuario`), `domicilio` |
| Nombre, TAG, serie, marca, año, ubicación | `nombre`, `tag`, `numeroSerie`, `marca`, `anioFabricacion`, `ubicacion` |
| Presiones, temperaturas, fluido, capacidad | `presionDiseno`, `presionCalibracion`, `presionOperacion`, `tempDiseno`, `tempOperacion`, `fluido`, `capacidadVolumetrica` |
| Materiales, Ø válvula, plano No. | `materialCuerpo`, `materialTapa`, `diametroValvulaMm`, `codigoMemoriaCalculo` |
| Ø, L, profundidad de tapa | `diametroInteriorCm`, `longitudMm`, `profundidadTapaMm` |
| PRES. TRAB. MAX. PERM. | `presionTrabajoMaxPermitida` (vinculada) |

- Al volver al expediente después de editar en el plano se repintan sus campos. El plano se repinta al abrirlo.
- **Pm:** en cada guardado (`guardar()`) y en `migrar()`, si Pm env y Pm tapas se pueden calcular, `presionTrabajoMaxPermitida = min(...)` con 2 decimales. En el expediente el campo queda gris con «vinculado al plano» (hojas 10 y 66 lo usan). Sin Pm calculable, el campo vuelve a ser manual y conserva su último valor. Se quitó el botón «Usar Pm» de v1.

## Un solo Importar levantamiento

`importarLevantamientos()` es la única ruta. La usan:
- «Importar levantamiento» en el expediente (barra del borrador y Equipos).
- Nuevo «Importar levantamiento» en la barra del Plano (se queda en el Plano con el equipo importado).
- Nuevo «Pasar a expediente y plano» en el Levantamiento (sin exportar el JSON; también abre el Plano).

Llena el equipo y el plano lee ese mismo equipo. Reglas de v7 sin cambio: la primera importación reutiliza el equipo en blanco de «Nuevo expediente» y las siguientes agregan; razón social solo si está vacía; capacidad normalizada; espesores 1–16; después `migrar()`.

## Boquillas agrupadas por tipo

- **Regla de letras:** una letra por **tipo**, A, B, C… en el orden en que cada tipo aparece por primera vez en la lista del levantamiento (`FXLev.grupos`). Las del mismo tipo comparten letra (TAPÓN y DESFOGUE incluidos).
- **Croquis:** las del mismo tipo se dibujan en el punto de la primera. Tipos distintos que caen juntos (mismo carril, a menos de dos globos) comparten guía con las letras lado a lado («B C»).
- **Tabla:** `ITEM | Ø mm | TIPO | CANTIDAD | SERVICIO`. Un renglón por tipo; si el Ø cambia dentro del tipo, otro renglón con la misma letra (la letra se imprime solo en el primero). TIPO = conexión por tipo (editable) → conexión por omisión → COPLE. SERVICIO = tipo de boquilla.
- **Vista lateral / superior:** ángulo por tipo editable; por omisión según la cara. H: arriba 0°, atrás 90°, abajo 180°, frente 270°, lado = sobre la tapa. V: atrás 0°, frente 180°, lado 270° / 90°, arriba y abajo = sobre la tapa.
- **Plano:** croquis interactivo (arrastrar mueve todo el tipo; flechas para afinar), tabla de grupos y lista una por una (agregar, quitar, tipo, Ø, cara). Los cambios van a `equipo.levantamiento.boquillas`. Si el equipo no tenía levantamiento se crea uno mínimo con `origen:'plano'`.
- **El levantamiento sigue con una letra por boquilla** (pantalla, PDF y JSON `letra` sin cambio).

## Croquis de ubicación (nuevo)

Tarjeta en el Plano con tres modos:
- **Sin croquis.**
- **Plano del lugar:** se carga una imagen PNG/JPG y se toca o arrastra para poner la punta de la flecha; la dirección se elige de 15° en 15°. Al pie de la flecha va el TAG.
- **Esquema:** cuarto con puerta (lado y posición) y equipo; se toca para moverlo. Lleva rótulo (por omisión, la ubicación del equipo).

Se guarda en `equipo.plano.ubic*`. La imagen se guarda como `IMG['e:<id>:ubicPlano']`: va en IndexedDB y en Exportar/Importar borrador, se borra con el equipo y con «Nuevo expediente», y nunca va a Firebase. En la hoja va en la columna derecha; si no cabe, se omite y la etiqueta de la vista previa lo dice.

## Etiquetas del levantamiento

| Antes | Ahora |
|---|---|
| Cliente | **Razón Social** |
| Planta | **Ubicación** |
| Tanque | **Nombre del equipo** |

Aplica en pantalla, en el PDF del levantamiento (RAZÓN SOCIAL / UBICACIÓN / NOMBRE DEL EQUIPO) y en las ayudas. Placeholders: `CUARTO DE MÁQUINAS`, `COMPRESOR DE AIRE NO.1`. Las llaves JSON `cliente`, `planta` y `tanque` se conservan: los JSON v1 y v2 siguen importando igual.

## Fórmulas (confirmación, sin cambio desde v1)

- UG-27 y Pm con t empleado; K = 1.00.
- A tapas = `(1.09·D² + 3.1416·D·C.R.) × 2`, **sin** el ×2 doble del DWG.
- V tapas = `(0.1309·D³ + 0.785·D²·C.R.) × 2`.
- Relevo: Wa, W, P = Pc × 1.1 + 1.033, **T = °C + 273**, A = W/(C K P)·√(T/M).
- Lo que falta queda en «—» y como pendiente; nunca se usan números de muestra.

| Muestra | Pm | A tapas | A desfogue |
|---|---|---|---|
| H Coyote | 20.16 | 0.913 | **0.0505** |
| V Tucanes | 20.26 | 1.007 | **0.0706** |

## Cambio consciente fuera del Plano

`migrar()` ya **no** sobrescribe siempre los materiales con SA-414-G. Lo hace solo si el campo está vacío o no empieza con `SA-` (legacy SAE-J403-1008, etc.). Así se puede capturar SA-455 como en la muestra V. «Cargar ejemplo» sigue dando SA-414-G.

## Pruebas

- **FXLev:** 900 croquis aleatorios del levantamiento (H/V, 0–13 boquillas, con y sin datos) idénticos a v7: la agrupación y las cotas solo se activan desde el plano.
- **Regresión NOM-020** (Chromium, azar y fecha fijos, «Cargar ejemplo» → ZIP): v1 y v2 dan un PDF **idéntico byte por byte**. Con S y C.R. capturados en el plano, el expediente generado imprime la Pm vinculada (18.36) en lugar de 18.65.
- **Chromium (Firebase bloqueado), sin errores de página:**
  - Plano vacío con pendientes.
  - Importar H desde el Plano: se queda en el Plano y queda con 2 pendientes.
  - Capturar S y C.R.: memoria completa; Pm 20.16 gris en el plano y en el expediente.
  - Razón social, material y Ø de válvula editados en el plano se ven en el expediente; P diseño y TAG editados en el expediente se ven en el plano (hidrostática 12.10).
  - Croquis de ubicación (esquema e imagen + flecha) y arrastre de boquillas.
  - Conexión por tipo (NIPLE) en la tabla.
  - Exportar PDF y SVG.
  - Importar V desde el expediente: 2 equipos.
  - Recargar: persisten vista y datos.
  - Exportar/Importar borrador conserva plano, ubicación e imagen.
  - «Nuevo expediente» + «Pasar a expediente y plano»: reutiliza el equipo en blanco.
  - PDF del levantamiento con las etiquetas nuevas.
  - 390 px sin scroll horizontal.

## Fuera de alcance (sin cambios)

- DWG/DXF en el navegador.
- S desde tablas de materiales.
- Hojas 6, 23, 66, 94, 96, 106 y demás algoritmos del motor (solo cambia el valor de `presionTrabajoMaxPermitida` por la sincronía).
- Firmas, glyphs, hidrostática = diseño × 1.1, máscara de memoria, RFC de 12, nombres de archivo, Firebase solo para globales, tema `fenixmex-theme`.
- «Nuevo expediente» limpia igual.
- Formatos H/V en blanco.
- Deploy.
