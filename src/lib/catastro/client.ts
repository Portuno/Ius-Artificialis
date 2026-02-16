import type { CatastroProperty, CatastroQueryResult } from "./types";

// Servicio oficial gratuito del Catastro (Sede Electrónica)
// Endpoint Consulta_DNPRC: datos no protegidos de inmuebles por referencia catastral
// Documentación: https://ovc.catastro.meh.es/ovcservweb/ovcswlocalizacionrc/ovccallejero.asmx?op=Consulta_DNPRC
//
// ── Análisis de información recibida y limitaciones ─────────────────────────
// • Urbano (cn=UR): dirección (tv, nv, pnp), provincia (np), municipio (nm),
//   uso (luso), superficie (sfc), año (ant). Opcionales: ldt, lbl, lnes, lplt, lpta, cpt, cucons.
// • Rústico (cn=RU): suele venir sin dirección ni superficie construida; solo
//   provincia, municipio, tipo y a veces uso. Para parcela/cultivos hace falta
//   otra consulta o ver la ficha en la Sede.
// • Si se envía RC de 14 caracteres (parcela), el servicio devuelve lista de
//   inmuebles; el parser actual toma el primero. Para “consultar todos” se
//   usa una RC completa por propiedad.
// • Solución para datos faltantes: enlace a la Sede (RCCompleta) para que el
//   usuario consulte la ficha oficial y, si en el futuro se integra otro
//   endpoint (ej. subparcelas), ampliar el parser.
const OVC_BASE =
  "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC";

/** URL de la Sede Electrónica del Catastro para consultar un inmueble por referencia catastral. */
export const getCatastroPropertyUrl = (referenciaCatastral: string): string => {
  const rc = referenciaCatastral?.trim() || "";
  if (!rc) return "https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCBusqueda.aspx";
  return `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCBusqueda.aspx?RCCompleta=${encodeURIComponent(rc)}`;
};

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

  // Tipo de bien (idbi/cn): UR = Urbano, RU = Rústico
  const cn = extractXmlTag(xml, "cn");
  const tipo_bien: CatastroProperty["tipo_bien"] =
    cn === "UR" || cn === "RU" ? cn : null;

  // Domicilio tributario (texto)
  const domicilio_tributario = extractXmlTag(xml, "ldt") ?? null;

  // Use
  const uso = extractXmlTag(xml, "luso") ?? null;

  // Built surface (sfc)
  const sfcStr = extractXmlTag(xml, "sfc");
  const superficie = sfcStr ? parseFloat(sfcStr) || null : null;

  // Year of construction (ant)
  const antStr = extractXmlTag(xml, "ant");
  const anio_construccion = antStr ? parseInt(antStr, 10) || null : null;

  // Localización interna (bloque, escalera, planta, puerta)
  const bloque = extractXmlTag(xml, "lbl") ?? null;
  const escalera = extractXmlTag(xml, "lnes") ?? null;
  const planta = extractXmlTag(xml, "lplt") ?? null;
  const puerta = extractXmlTag(xml, "lpta") ?? null;

  // Coeficiente de participación (cpt)
  const cptStr = extractXmlTag(xml, "cpt");
  const coeficiente_participacion = cptStr
    ? parseFloat(cptStr.replace(",", ".")) || null
    : null;

  // Número de unidades constructivas (cucons)
  const cuconsStr = extractXmlTag(xml, "cucons");
  const num_unidades_constructivas = cuconsStr
    ? parseInt(cuconsStr, 10) || null
    : null;

  const raw_data: Record<string, unknown> = {
    source: "ovc.catastro.meh.es",
    xmlLength: xml.length,
    tipo_bien: tipo_bien ?? undefined,
    domicilio_tributario: domicilio_tributario ?? undefined,
    bloque: bloque ?? undefined,
    escalera: escalera ?? undefined,
    planta: planta ?? undefined,
    puerta: puerta ?? undefined,
    coeficiente_participacion: coeficiente_participacion ?? undefined,
    num_unidades_constructivas: num_unidades_constructivas ?? undefined,
  };

  return {
    direccion,
    provincia,
    municipio,
    superficie,
    uso,
    anio_construccion,
    referencia_catastral: rc,
    tipo_bien,
    domicilio_tributario,
    bloque,
    escalera,
    planta,
    puerta,
    coeficiente_participacion,
    num_unidades_constructivas,
    raw_data,
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
