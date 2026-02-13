// --- Expedientes ---

export type ExpedienteEstado = "abierto" | "en_proceso" | "cerrado" | "archivado";

export type TipoCausa = "herencia" | "facturacion" | "litigio_civil" | "otro";

export type TipoPersona = "fisica" | "juridica";

export type RolProcesal =
  | "causante"
  | "heredero"
  | "acreedor"
  | "deudor"
  | "notario"
  | "testigo"
  | "emisor"
  | "otro";

export type TipoEvento =
  | "documento_subido"
  | "fecha_fallecimiento"
  | "fecha_escritura"
  | "fecha_factura"
  | "vencimiento"
  | "hito_manual";

export interface Expediente {
  id: string;
  user_id: string;
  numero_expediente: string;
  titulo: string;
  cliente: string | null;
  tipo_causa: TipoCausa;
  estado: ExpedienteEstado;
  descripcion: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sujeto {
  id: string;
  expediente_id: string;
  nombre_completo: string;
  tipo_persona: TipoPersona;
  dni_cif: string | null;
  rol_procesal: RolProcesal;
  contacto_email: string | null;
  contacto_telefono: string | null;
  direccion: string | null;
  datos_extra: Record<string, unknown>;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  expediente_id: string;
  document_id: string | null;
  fecha: string;
  titulo: string;
  descripcion: string | null;
  tipo_evento: TipoEvento;
  created_at: string;
}

// --- Documentos ---

export type DocumentStatus =
  | "pending"
  | "processing"
  | "extracted"
  | "validated"
  | "error";

export type DocumentType =
  | "factura"
  | "escritura_herencia"
  | "dni"
  | "extracto_bancario"
  | "otro";

export interface Document {
  id: string;
  user_id: string;
  expediente_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  doc_type: DocumentType | null;
  classification_confidence: number | null;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface IvaEntry {
  porcentaje: number;
  importe: number;
}

export interface Invoice {
  id: string;
  document_id: string;
  user_id: string;
  emisor: string | null;
  cif: string | null;
  fecha: string | null;
  base_imponible: number | null;
  tipos_iva: IvaEntry[];
  total: number | null;
  concepto: string | null;
  numero_factura: string | null;
  confidence_scores: Record<string, number>;
  validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  page_number?: number | null;
  created_at: string;
}

export interface InheritanceDeed {
  id: string;
  document_id: string;
  user_id: string;
  causante: string | null;
  fecha_fallecimiento: string | null;
  notario: string | null;
  protocolo: string | null;
  fecha_escritura: string | null;
  confidence_scores: Record<string, number>;
  validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

export interface Heir {
  id: string;
  deed_id: string;
  nombre: string;
  rol: string | null;
  dni: string | null;
  porcentaje: number | null;
  created_at: string;
}

export interface Property {
  id: string;
  deed_id: string;
  descripcion: string | null;
  referencia_catastral: string | null;
  valor_declarado: number | null;
  catastro_direccion: string | null;
  catastro_provincia: string | null;
  catastro_municipio: string | null;
  catastro_superficie: number | null;
  catastro_uso: string | null;
  catastro_anio_construccion: number | null;
  catastro_raw_data: Record<string, unknown> | null;
  valor_referencia: number | null;
  desviacion_fiscal: number | null;
  alerta_fiscal: boolean;
  catastro_consultado: boolean;
  created_at: string;
}
