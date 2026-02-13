-- Tabla de Sujetos: personas físicas y jurídicas vinculadas a un expediente
-- Pueden ser creados manualmente o auto-generados al procesar documentos

create table if not exists sujetos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade not null,
  nombre_completo text not null,
  tipo_persona text not null default 'fisica' check (tipo_persona in ('fisica', 'juridica')),
  dni_cif text,
  rol_procesal text not null default 'otro' check (rol_procesal in ('causante', 'heredero', 'acreedor', 'deudor', 'notario', 'testigo', 'emisor', 'otro')),
  contacto_email text,
  contacto_telefono text,
  direccion text,
  datos_extra jsonb default '{}',
  created_at timestamptz default now()
);

-- Indices
create index if not exists idx_sujetos_expediente_id on sujetos(expediente_id);
create index if not exists idx_sujetos_dni_cif on sujetos(dni_cif);
