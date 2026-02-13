import { getGeminiClient, GEMINI_MODEL } from "./client";
import { classificationSchema, type ClassificationResult } from "./schemas";
import { zodToJsonSchema } from "zod-to-json-schema";

const CLASSIFICATION_PROMPT = `Eres un sistema experto de clasificación documental para un despacho jurídico español.

Analiza el documento proporcionado y clasifícalo en una de estas categorías:
- "factura": Facturas de proveedores, recibos con importes, CIF, IVA
- "escritura_herencia": Escrituras notariales de herencia, testamentos, adjudicaciones hereditarias
- "dni": Documentos de identidad (DNI, NIE, pasaporte)
- "extracto_bancario": Extractos de cuenta, movimientos bancarios
- "otro": Cualquier documento que no encaje en las categorías anteriores

Responde con el tipo de documento, tu nivel de confianza (0.0 a 1.0), y una breve justificación.`;

export const classifyDocument = async (
  fileBase64: string,
  mimeType: string
): Promise<ClassificationResult> => {
  const genai = getGeminiClient();
  const jsonSchema = zodToJsonSchema(classificationSchema);

  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: CLASSIFICATION_PROMPT },
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
      responseSchema: jsonSchema as Record<string, unknown>,
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(text);
  return classificationSchema.parse(parsed);
};
