import { getGeminiClient, GEMINI_MODEL } from "./client";
import {
  invoiceExtractionSchema,
  invoicesExtractionSchema,
  type InvoiceExtractionResult,
} from "./schemas";

const INVOICE_PROMPT = `Eres un sistema experto de extracción de datos de facturas para un despacho jurídico y contable español.

Analiza la factura proporcionada y extrae los siguientes campos con la mayor precisión posible:

1. **emisor**: Nombre o razón social del emisor de la factura
2. **cif**: CIF/NIF del emisor
3. **numero_factura**: Número de factura
4. **fecha**: Fecha de emisión (formato YYYY-MM-DD)
5. **items**: Desglose de líneas (items) de la factura. Para cada item extrae:
   - **descripcion**
   - **cantidad** (número; por ejemplo litros)
   - **unidad** (ej: "L", "litros", "kg", "ud"; si son litros, preferir "L")
   - **precio_unitario** (si aparece)
   - **importe** (importe de ESA línea)
6. **base_imponible**: Base imponible total en euros (secundario)
7. **tipos_iva**: Array con cada tipo de IVA aplicado (porcentaje e importe)
8. **total**: Importe total de la factura en euros
9. **concepto**: Descripción o concepto principal de la factura

Para cada campo, proporciona:
- "value": El valor extraído (null si no se encuentra)
- "confidence": Tu nivel de confianza en la extracción (0.0 a 1.0)

Si un campo no es legible o no está presente, pon value como null y confidence baja.
Los importes deben ser números decimales (ej: 1234.56).

REGLAS IMPORTANTES PARA ITEMS:
- No inventes líneas: si no se distinguen, devuelve items como [].
- Si aparece combustible (Gasoil/Gasóleo/Gasoil A/Gasoleo A/Diesel), es CRÍTICO extraer la línea específica con su cantidad (litros si figura) y su importe.
- Si el documento muestra varias líneas similares, incluye todas las líneas visibles.`;

const INVOICES_PROMPT = `Eres un sistema experto de extracción de datos de facturas para un despacho jurídico y contable español.

El documento puede contener **una o más facturas**. Identifica cada factura (por ejemplo cada página puede ser una factura, o puede haber varias en una página, o una factura puede extenderse por múltiples páginas). Para cada factura extrae exactamente los mismos campos:

1. **emisor**: Nombre o razón social del emisor
2. **cif**: CIF/NIF del emisor
3. **numero_factura**: Número de factura
4. **fecha**: Fecha de emisión (formato YYYY-MM-DD)
5. **items**: Desglose de líneas (items) de la factura. Para cada item extrae:
   - **descripcion**
   - **cantidad** (número; por ejemplo litros)
   - **unidad** (ej: "L", "litros", "kg", "ud"; si son litros, preferir "L")
   - **precio_unitario** (si aparece)
   - **importe** (importe de ESA línea)
6. **base_imponible**: Base imponible total en euros (secundario)
7. **tipos_iva**: Array con cada tipo de IVA (porcentaje e importe)
8. **total**: Importe total en euros
9. **concepto**: Descripción o concepto principal
10. **page_number**: Número de página del PDF donde se encuentra esta factura (empezando desde 1). Si la factura ocupa múltiples páginas, indica la primera página donde aparece. Si puedes identificar la página basándote en números de página visibles en el documento, márcalos, números de página, encabezados o pies de página, úsalos. Si no puedes determinar la página con certeza, devuelve null.

IMPORTANTE: El campo page_number es crítico para la navegación del usuario. Intenta siempre identificar la página cuando sea posible. Si el documento tiene números de página visibles, úsalos. Si no, intenta inferir la página basándote en el orden de aparición de las facturas en el documento.

Devuelve un objeto con una propiedad "facturas" que sea un array: un elemento por cada factura encontrada en el documento. Si solo hay una factura, el array tendrá un solo elemento. Para cada campo de cada factura proporciona "value" (null si no se encuentra) y "confidence" (0.0 a 1.0). Los importes deben ser números decimales (ej: 1234.56).

REGLAS IMPORTANTES PARA ITEMS:
- No inventes líneas: si no se distinguen, devuelve items como [].
- Si aparece combustible (Gasoil/Gasóleo/Gasoil A/Gasoleo A/Diesel), es CRÍTICO extraer la línea específica con su cantidad (litros si figura) y su importe.
- Si el documento muestra varias líneas similares, incluye todas las líneas visibles.`;

/** Extracts all invoices from a document (multi-page or multi-invoice PDF). */
export const extractInvoices = async (
  fileBase64: string,
  mimeType: string
): Promise<InvoiceExtractionResult[]> => {
  const genai = getGeminiClient();

  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: INVOICES_PROMPT },
          {
            inlineData: {
              mimeType,
              data: fileBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(text);
  const result = invoicesExtractionSchema.parse(parsed);
  return result.facturas;
};

/** Single-invoice extraction (uses first invoice from extractInvoices). */
export const extractInvoice = async (
  fileBase64: string,
  mimeType: string
): Promise<InvoiceExtractionResult> => {
  const facturas = await extractInvoices(fileBase64, mimeType);
  if (facturas.length === 0) {
    return invoiceExtractionSchema.parse({
      emisor: { value: null, confidence: 0 },
      cif: { value: null, confidence: 0 },
      numero_factura: { value: null, confidence: 0 },
      fecha: { value: null, confidence: 0 },
      items: [],
      base_imponible: { value: null, confidence: 0 },
      tipos_iva: [],
      total: { value: null, confidence: 0 },
      concepto: { value: null, confidence: 0 },
    });
  }
  return facturas[0];
};
