export interface CatastroProperty {
  direccion: string;
  provincia: string;
  municipio: string;
  superficie: number | null;
  uso: string | null;
  anio_construccion: number | null;
  referencia_catastral: string;
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
