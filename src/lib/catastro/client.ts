import type { CatastroProperty, CatastroQueryResult } from "./types";

// Servicio oficial gratuito del Catastro (Sede Electrónica)
// Endpoint Consulta_DNPRC: datos no protegidos de inmuebles por referencia catastral
// Documentación: https://ovc.catastro.meh.es/ovcservweb/ovcswlocalizacionrc/ovccallejero.asmx?op=Consulta_DNPRC
const OVC_BASE =
  "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC";

export const queryCatastro = async (
  referenciaCatastral: string
): Promise<CatastroQueryResult> => {
  if (!referenciaCatastral || referenciaCatastral.length < 14) {
    return {
      success: false,
      error: "Referencia catastral inválida (mínimo 14 caracteres)",
    };
  }

  const url = `${OVC_BASE}?Provincia=&Municipio=&RC=${encodeURIComponent(referenciaCatastral)}`;

  // #region agent log
  fetch("http://127.0.0.1:7244/ingest/f2ca299e-e4ff-4791-b8b9-1cb36e733abb", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "catastro/client.ts:queryCatastro",
      message: "OVC Catastro request",
      data: { url, rcLength: referenciaCatastral.length },
      timestamp: Date.now(),
      hypothesisId: "H7-ovc",
    }),
  }).catch(() => {});
  // #endregion

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/f2ca299e-e4ff-4791-b8b9-1cb36e733abb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "catastro/client.ts:response.notOk",
          message: "OVC error",
          data: { status: response.status, bodyPreview: errorText.slice(0, 300) },
          timestamp: Date.now(),
          hypothesisId: "H7-ovc",
        }),
      }).catch(() => {});
      // #endregion
      return {
        success: false,
        error: `Catastro OVC (${response.status}): ${errorText.slice(0, 150)}`,
      };
    }

    const xml = await response.text();

    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f2ca299e-e4ff-4791-b8b9-1cb36e733abb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "catastro/client.ts:response.ok",
        message: "OVC success - raw XML preview",
        data: { status: response.status, xmlPreview: xml.slice(0, 500) },
        timestamp: Date.now(),
        hypothesisId: "H7-ovc",
      }),
    }).catch(() => {});
    // #endregion

    // Check for error in XML response
    const errCode = extractXmlTag(xml, "cuerr");
    if (errCode && errCode !== "0") {
      const errDesc = extractXmlTag(xml, "des") || "Error desconocido del Catastro";
      return { success: false, error: `Catastro: ${errDesc}` };
    }

    const property = parseOvcXml(xml, referenciaCatastral);

    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f2ca299e-e4ff-4791-b8b9-1cb36e733abb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "catastro/client.ts:parsed",
        message: "Parsed property",
        data: { direccion: property.direccion, provincia: property.provincia, municipio: property.municipio, superficie: property.superficie, uso: property.uso, anio: property.anio_construccion },
        timestamp: Date.now(),
        hypothesisId: "H7-ovc",
      }),
    }).catch(() => {});
    // #endregion

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

// ── XML helpers (no external deps) ──────────────────────────────────────────

const extractXmlTag = (xml: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
};

const extractAllXmlTags = (xml: string, tag: string): string[] => {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
};

const parseOvcXml = (xml: string, rc: string): CatastroProperty => {
  // Province & municipality
  const provincia = extractXmlTag(xml, "np") ?? "";
  const municipio = extractXmlTag(xml, "nm") ?? "";

  // Address: type of road (tv) + name (nv) + number (pnp)
  const tv = extractXmlTag(xml, "tv") ?? "";
  const nv = extractXmlTag(xml, "nv") ?? "";
  const pnp = extractXmlTag(xml, "pnp") ?? "";
  const direccion = [tv, nv, pnp].filter(Boolean).join(" ").trim();

  // Use
  const uso = extractXmlTag(xml, "luso") ?? null;

  // Built surface (sfc)
  const sfcStr = extractXmlTag(xml, "sfc");
  const superficie = sfcStr ? parseFloat(sfcStr) || null : null;

  // Year of construction (ant)
  const antStr = extractXmlTag(xml, "ant");
  const anio_construccion = antStr ? parseInt(antStr, 10) || null : null;

  return {
    direccion,
    provincia,
    municipio,
    superficie,
    uso,
    anio_construccion,
    referencia_catastral: rc,
    raw_data: {
      source: "ovc.catastro.meh.es",
      xmlLength: xml.length,
    },
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
