import { z } from "zod";

// --- Classification Schema ---
export const classificationSchema = z.object({
  document_type: z.enum([
    "factura",
    "escritura_herencia",
    "dni",
    "extracto_bancario",
    "otro",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;

// --- Invoice Extraction Schema (single item) ---
export const invoiceExtractionItemSchema = z.object({
  emisor: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  cif: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  numero_factura: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  fecha: z.object({
    value: z.string().nullable().describe("Fecha en formato YYYY-MM-DD"),
    confidence: z.number().min(0).max(1),
  }),
  base_imponible: z.object({
    value: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  tipos_iva: z.array(
    z.object({
      porcentaje: z.number(),
      importe: z.number(),
    })
  ),
  total: z.object({
    value: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  concepto: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  page_number: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .describe("Número de página del PDF donde se encuentra esta factura (1-indexed). Si la factura ocupa múltiples páginas, indica la primera página donde aparece. Si no puedes determinar la página, devuelve null."),
});

/** @deprecated Use invoiceExtractionItemSchema. Kept for backward compatibility. */
export const invoiceExtractionSchema = invoiceExtractionItemSchema;

export type InvoiceExtractionResult = z.infer<typeof invoiceExtractionItemSchema>;

// --- Multi-invoice extraction (array of facturas) ---
export const invoicesExtractionSchema = z.object({
  facturas: z.array(invoiceExtractionItemSchema),
});

export type InvoicesExtractionResult = z.infer<typeof invoicesExtractionSchema>;

// --- Inheritance Deed Extraction Schema ---
export const deedExtractionSchema = z.object({
  causante: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  fecha_fallecimiento: z.object({
    value: z.string().nullable().describe("Fecha en formato YYYY-MM-DD"),
    confidence: z.number().min(0).max(1),
  }),
  notario: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  protocolo: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  fecha_escritura: z.object({
    value: z.string().nullable().describe("Fecha en formato YYYY-MM-DD"),
    confidence: z.number().min(0).max(1),
  }),
  herederos: z.array(
    z.object({
      nombre: z.string(),
      rol: z.string().nullable(),
      dni: z.string().nullable(),
      porcentaje: z.number().nullable(),
    })
  ),
  bienes_inmuebles: z.array(
    z.object({
      descripcion: z.string(),
      referencia_catastral: z
        .string()
        .nullable()
        .describe("Referencia catastral de 20 caracteres"),
      valor_declarado: z.number().nullable(),
    })
  ),
});

export type DeedExtractionResult = z.infer<typeof deedExtractionSchema>;
