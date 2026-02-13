-- Tabla de Expedientes: entidad raíz del sistema
-- Cada expediente agrupa documentos, sujetos, bienes y datos financieros de una causa

create table if not exists expedientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  numero_expediente text not null,
  titulo text not null,
  cliente text,
  tipo_causa text not null default 'otro' check (tipo_causa in ('herencia', 'facturacion', 'litigio_civil', 'otro')),
  estado text not null default 'abierto' check (estado in ('abierto', 'en_proceso', 'cerrado', 'archivado')),
  descripcion text,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indices para busquedas frecuentes
create index if not exists idx_expedientes_user_id on expedientes(user_id);
create index if not exists idx_expedientes_estado on expedientes(estado);
create index if not exists idx_expedientes_tipo_causa on expedientes(tipo_causa);
