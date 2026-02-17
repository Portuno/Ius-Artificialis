import { z } from "zod";

const confidenceValueSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable(),
    confidence: z.number().min(0).max(1),
  });

const confidenceValueWithDefault = <T extends z.ZodTypeAny>(valueSchema: T) =>
  confidenceValueSchema(valueSchema)
    .optional()
    .default({ value: null, confidence: 0 });

const coerceValueField = (v: unknown) => {
  if (typeof v === "object" && v != null && "value" in v) {
    // Gemini sometimes returns { value, confidence } even when not requested.
    return (v as any).value;
  }
  return v;
};

const coerceNumberSchema = (nullable: boolean) =>
  z.preprocess((v) => {
    const raw = coerceValueField(v);
    if (typeof raw === "string") {
      const normalized = raw.replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : raw;
    }
    return raw;
  }, nullable ? z.number().nullable() : z.number());

// --- Invoice Line Items Schema ---
export const invoiceLineItemSchema = z.object({
  descripcion: confidenceValueWithDefault(z.string()),
  cantidad: confidenceValueWithDefault(z.number()),
  unidad: confidenceValueWithDefault(z.string()),
  precio_unitario: confidenceValueWithDefault(z.number()),
  importe: confidenceValueWithDefault(z.number()),
});

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
      porcentaje: coerceNumberSchema(true),
      importe: coerceNumberSchema(true),
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
  items: z
    .array(invoiceLineItemSchema)
    .optional()
    .default([])
    .describe(
      "Desglose de líneas de la factura (items). Cada item incluye value/confidence por campo. Puede ser un array vacío si no se distinguen líneas."
    ),
  page_number: z
    .preprocess(
      (v) => coerceValueField(v),
      z.number().int().positive().nullable().optional()
    )
    .describe(
      "Número de página del PDF donde se encuentra esta factura (1-indexed). Si la factura ocupa múltiples páginas, indica la primera página donde aparece. Si no puedes determinar la página, devuelve null."
    ),
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
