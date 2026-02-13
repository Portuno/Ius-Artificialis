import { getGeminiClient, GEMINI_MODEL } from "./client";
import { deedExtractionSchema, type DeedExtractionResult } from "./schemas";
import { zodToJsonSchema } from "zod-to-json-schema";

const DEED_PROMPT = `Eres un sistema experto de extracción de datos de escrituras de herencia para un despacho jurídico español.

Analiza la escritura de herencia proporcionada y extrae los siguientes datos con la mayor precisión posible:

1. **causante**: Nombre completo de la persona fallecida (causante de la herencia)
2. **fecha_fallecimiento**: Fecha de fallecimiento (formato YYYY-MM-DD)
3. **notario**: Nombre del notario que autoriza la escritura
4. **protocolo**: Número de protocolo notarial
5. **fecha_escritura**: Fecha de la escritura (formato YYYY-MM-DD)
6. **herederos**: Lista de herederos con:
   - nombre: Nombre completo
   - rol: Tipo de heredero (heredero_universal, legatario, usufructuario, nudo_propietario)
   - dni: DNI/NIE si aparece
   - porcentaje: Porcentaje de participación si se especifica
7. **bienes_inmuebles**: Lista de bienes inmuebles mencionados con:
   - descripcion: Descripción del inmueble (tipo, ubicación, características)
   - referencia_catastral: Referencia catastral de 20 caracteres alfanuméricos (MUY IMPORTANTE - busca códigos tipo "1234567VK4713N0001PP")
   - valor_declarado: Valor declarado en la escritura en euros

Para los campos principales, proporciona:
- "value": El valor extraído (null si no se encuentra)
- "confidence": Tu nivel de confianza (0.0 a 1.0)

IMPORTANTE: Presta especial atención a las referencias catastrales. Son códigos alfanuméricos de exactamente 20 caracteres que identifican de forma única cada inmueble en España. Suelen aparecer cerca de la descripción de las fincas.`;

export const extractDeed = async (
  fileBase64: string,
  mimeType: string
): Promise<DeedExtractionResult> => {
  const genai = getGeminiClient();
  const jsonSchema = zodToJsonSchema(deedExtractionSchema);

  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: DEED_PROMPT },
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
  return deedExtractionSchema.parse(parsed);
};
