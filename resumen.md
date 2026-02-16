## Resumen del reto y del producto

- **Despacho**: Varona Legal & Numbers (áreas mercantil y procesal).
- **Problema actual**: Grandes volúmenes de documentación (facturas, escrituras, balances…) se procesan **a mano** y se vuelcan en **Excel**, con mucho tiempo perdido y alto riesgo de errores.
- **Objetivo del reto**: Diseñar una aplicación que:
  - **Automatice la carga masiva de facturas** y extraiga/estructure los datos relevantes para litigios y otros procedimientos patrimoniales.
  - **(Bonus)** Extraiga información de **escrituras de herencia** y obtenga **valor de referencia** de inmuebles vía **Catastro**.

## Lo que ya hace hoy la app

### Stack técnicoimage.png

- **Frontend**: Next.js + React + TypeScript.
- **UI**: TailwindCSS + Radix UI + iconos (Lucide).
- **Backend**: API Routes de Next.js.
- **Datos**: Supabase (PostgreSQL) + Supabase Storage para documentos.
- **IA**: Gemini 2.5 Flash (`@google/genai`) para clasificación y extracción.
- **Registros públicos**: Integración real con **Catastro OVC** (`ovc.catastro.meh.es`) para consultar referencias catastrales.

### Flujos principales implementados

- **1. Carga y clasificación de documentos**
  - Subida masiva de PDFs/imágenes, con asociación a **expedientes**.
  - Clasificación automática vía IA en: `factura`, `escritura_herencia`, `dni`, `extracto_bancario`, `otro`.

- **2. Extracción de datos**
  - **Facturas**:
    - Extracción automática de emisor, CIF/NIF, fecha, bases imponibles, tipos de IVA, total, etc.
    - Soporte para **múltiples facturas** dentro de un mismo documento.
  - **Escrituras de herencia**:
    - Extracción de causante, lista de herederos, notario, protocolo.
    - Detección de **bienes inmuebles** con su **referencia catastral** cuando aparece.

- **3. Gestión de expedientes**
  - Listado de expedientes.
  - Vista de detalle con 4 cuadrantes:
    - **Documental**: documentos asociados.
    - **Patrimonial**: inmuebles y bienes.
    - **Sujetos**: personas implicadas (causante, herederos, etc.).
    - **Financiero**: totales y visión económica del expediente.

- **4. Centro de valoración catastral**
  - Listado / grid de inmuebles asociados a expedientes.
  - Consulta **real** a Catastro por referencia catastral.
  - Obtención de datos clave: dirección, municipio, provincia, uso, superficie, año, tipo (UR/RU).
  - Cálculo **heurístico** de un **valor de referencia** interno a partir de esos datos.
  - Comparación **valor declarado vs valor de referencia** y cálculo de **desviación fiscal**.
  - Alertas visuales básicas para inmuebles con desviaciones altas.

- **5. Validación humana (HITL)**
  - Cola de documentos con **baja confianza** en la extracción.
  - Interfaz para que el abogado revise/corrija campos antes de consolidar los datos.

- **6. Exportación**
  - Exportación de información procesada/validada en **JSON/Excel**.
  - Filtro por expediente / documentos para facilitar el trabajo posterior en Excel/ERP.

## Encaje con los casos de uso del reto

- **Clasificación masiva de facturación para litigios**:
  - Ya existe un **pipeline completo**: subida masiva → clasificación → extracción de campos relevantes de facturas → validación por excepción → exportación.
  - Esto ataca directamente el Excel manual y reduce el trabajo repetitivo.

- **Generación de listados de bienes inmuebles con valor de referencia (herencias)**:
  - La app **ya extrae inmuebles** de escrituras y sus referencias catastrales.
  - Se conecta a **Catastro** para obtener datos oficiales y calcula una **valoración heurística**.
  - El **Centro de Valoración** permite ver de un vistazo inmuebles, valores y desviaciones fiscales.

## Qué falta / huecos importantes

### Funcionalidad

- **Otros tipos documentales**:
  - `dni` y `extracto_bancario` se **clasifican**, pero todavía **no se explotan** (no hay extracción estructurada de campos).
- **Litigios masivos de facturas**:
  - No hay aún:
    - **Deduplicación** de facturas (mismo número/cif/importe).
    - Reglas fuertes de **validación de CIF/NIF** o número de factura.

### Valoración catastral (según `valoracion.md`)

- Mensajes de estado de `valor_referencia`:
  - La lógica de mensajes está cuidada en el **Centro de Valoración**, pero no está replicada en:
    - Resumen de expediente.
    - Exportaciones.
  - Haría falta unificar mensajes como:
    - “Pendiente de consultar Catastro”.
    - “Consultado pero sin valor disponible (limitación del servicio)”.
- **Agrupación por finca / referencia catastral**:
  - Hoy cada inmueble se muestra de forma independiente.
  - Falta detectar cuando varias tarjetas comparten la misma **referencia catastral** (o raíz de finca) y:
    - Agruparlas visualmente.
    - O al menos indicar “Comparte referencia con N inmuebles más”.
- **Resumen global de cobertura**:
  - No existe todavía un resumen en cabecera del tipo:
    - Nº inmuebles **urbanos vs rústicos**.
    - Nº con valor de referencia calculado vs sin valor.
    - % de cobertura de consultas a Catastro.
- **Heurística específica para rústicos**:
  - La heurística de valoración está pensada sobre todo para **urbanos**.
  - En rústicos el servicio devuelve menos datos; se ha planteado:
    - Usar superficie de la escritura.
    - Combinar con tablas sencillas de €/ha por tipo de uso para demo.
  - Hoy eso está solo como idea/backlog.
- **Indicadores visuales de riesgo fiscal**:
  - Existen alertas básicas, pero falta:
    - Badges claros tipo “Por debajo de valor de referencia” / “Muy por debajo”.
    - Ordenar/filtrar inmuebles por **desviación fiscal**.
- **Exportación enriquecida**:
  - Exportaciones todavía no incluyen todos los campos derivados:
    - `valor_referencia`, `desviacion_fiscal`, `alerta_fiscal`.
    - Motivo cuando no hay valor (`no_consultado`, `sin_superficie`, etc.).

### UX / percepción de “tratamiento masivo”

- Faltan detalles que refuercen la idea de **alto volumen**:
  - Mejor feedback global en la acción “Consultar todos” en Catastro (progreso claro, reintentos solo de fallidos).
  - Filtros y búsqueda más potentes en listas de documentos y expedientes.
  - Alguna métrica visible de “tiempo ahorrado” o volumen procesado.

## Plan de enfoque para la demo de la hackathon

- **1. Storytelling claro de producto**
  - Posicionar la app como **“fábrica de datos jurídicos”** para:
    - Litigios en masa basados en facturas.
    - Procedimientos patrimoniales complejos (herencias) con foco en riesgo fiscal.
  - Explicar que el modelo operativo es **“validación por excepción”**:
    - La IA hace el grueso de extracción.
    - El humano interviene solo si la confianza es baja.

- **2. Enseñar bien el flujo de facturas**
  - En la demo: subir lote de facturas → clasificación automática → extracción de importes/impuestos → revisión HITL de un caso dudoso → exportación lista para Excel/ERP.
  - Acompañar con un mensaje de negocio del tipo:
    - “Pasamos de X minutos por factura en Excel a <2 minutos por lote con revisión por excepción”.

- **3. Potenciar el Centro de Valoración Catastral**
  - Priorizar, si hay tiempo de código, algunas mejoras del backlog:
    - Mensajes coherentes de `valor_referencia` en todas las vistas.
    - Pequeño resumen de cobertura (urbano/rústico, con/sin valor).
    - Badges de riesgo fiscal y orden por desviación.
  - Preparar 2–3 ejemplos de:
    - Inmueble urbano “normal”.
    - Inmueble con **gran desviación**.
    - Algún caso rústico para explicar limitaciones y heurística.

- **4. Subrayar integración con registros públicos**
  - Explicar que la app **ya consulta Catastro real**, qué endpoint se usa y qué datos se guardan.
  - Aclarar la **trazabilidad**: cada valor mostrado puede rastrearse a:
    - Documento original.
    - Respuesta de Catastro.
    - Transformación heurística realizada.

- **5. Preparar discurso técnico y Q&A**
  - Tener preparado un **elevator pitch técnico** corto (Gemini + Supabase + Catastro).
  - Tener respuestas claras para:
    - **Precisión** y gestión de errores (confidence scores + HITL).
    - **Privacidad / GDPR** (datos en Supabase, uso de APIs públicas, control de accesos).
    - **Escalabilidad** (procesamiento por lotes, serverless, colas).

