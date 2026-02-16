/** Tipo de bien: UR = Urbano, RU = Rústico (idbi/cn en XML) */
export type CatastroTipoBien = "UR" | "RU" | null;

export interface CatastroProperty {
  direccion: string;
  provincia: string;
  municipio: string;
  superficie: number | null;
  uso: string | null;
  anio_construccion: number | null;
  referencia_catastral: string;
  /** UR = Urbano, RU = Rústico. En rústicos suele faltar dirección y superficie construida. */
  tipo_bien: CatastroTipoBien;
  /** Domicilio tributario (texto no estructurado). */
  domicilio_tributario: string | null;
  /** Localización interna: bloque, escalera, planta, puerta. */
  bloque: string | null;
  escalera: string | null;
  planta: string | null;
  puerta: string | null;
  /** Coeficiente de participación (por ejemplo en división horizontal). */
  coeficiente_participacion: number | null;
  /** Número de unidades constructivas (cucons en XML). */
  num_unidades_constructivas: number | null;
  /** Datos adicionales y metadatos del parseo. */
  raw_data: Record<string, unknown>;
}

export interface CatastroApiResponse {
  // The API response structure from CatastroAPI.es
  [key: string]: unknown;
}

export interface CatastroQueryResult {
  success: boolean;
  data?: CatastroProperty;
  error?: string;
}
