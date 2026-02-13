import type { CatastroProperty, CatastroQueryResult } from "./types";

const CATASTRO_API_BASE = "https://catastro-api.es/api";

export const queryCatastro = async (
  referenciaCatastral: string
): Promise<CatastroQueryResult> => {
  const apiKey = process.env.CATASTRO_API_KEY;

  if (!apiKey) {
    return { success: false, error: "CATASTRO_API_KEY no configurada" };
  }

  if (!referenciaCatastral || referenciaCatastral.length < 14) {
    return {
      success: false,
      error: "Referencia catastral inválida (mínimo 14 caracteres)",
    };
  }

  try {
    const response = await fetch(
      `${CATASTRO_API_BASE}/callejero/inmuebles-rc?rc=${encodeURIComponent(referenciaCatastral)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Error del Catastro (${response.status}): ${errorText}`,
      };
    }

    const rawData = await response.json();

    // Parse the response into our CatastroProperty format
    const property = parseCatastroResponse(rawData, referenciaCatastral);

    return { success: true, data: property };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al consultar el Catastro",
    };
  }
};

const parseCatastroResponse = (
  data: Record<string, unknown>,
  rc: string
): CatastroProperty => {
  // CatastroAPI.es returns structured JSON with property details
  // The exact structure depends on the API version, so we handle
  // both flat and nested structures

  const getString = (obj: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === "string" && val.length > 0) return val;
    }
    return "";
  };

  const getNumber = (
    obj: Record<string, unknown>,
    keys: string[]
  ): number | null => {
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return null;
  };

  return {
    direccion: getString(data, ["direccion", "address", "domicilio", "dir"]),
    provincia: getString(data, ["provincia", "province"]),
    municipio: getString(data, ["municipio", "municipality"]),
    superficie: getNumber(data, [
      "superficie",
      "surface",
      "superficieConstruida",
    ]),
    uso: getString(data, ["uso", "use", "clasePrincipal"]),
    anio_construccion: getNumber(data, [
      "anio_construccion",
      "yearBuilt",
      "anioConstruccion",
    ]),
    referencia_catastral: rc,
    raw_data: data,
  };
};

// Estimate a reference value based on available catastro data
// This is a simplified heuristic for hackathon demo purposes
export const estimateReferenceValue = (
  property: CatastroProperty
): number | null => {
  if (!property.superficie) return null;

  // Base price per m2 by use type (simplified Spanish averages)
  const pricePerM2: Record<string, number> = {
    residencial: 1200,
    comercial: 1500,
    industrial: 600,
    almacen: 400,
    oficina: 1400,
    garaje: 800,
  };

  const uso = (property.uso ?? "residencial").toLowerCase();
  let basePrice = 1200; // default to residential

  for (const [key, price] of Object.entries(pricePerM2)) {
    if (uso.includes(key)) {
      basePrice = price;
      break;
    }
  }

  // Age depreciation factor (simplified)
  const currentYear = new Date().getFullYear();
  const age = property.anio_construccion
    ? currentYear - property.anio_construccion
    : 20;
  const depreciationFactor = Math.max(0.5, 1 - age * 0.005);

  return Math.round(property.superficie * basePrice * depreciationFactor);
};
