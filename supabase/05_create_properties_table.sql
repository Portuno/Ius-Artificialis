-- Bienes inmuebles extraidos + datos del Catastro
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  deed_id uuid references inheritance_deeds(id) on delete cascade not null,
  descripcion text,
  referencia_catastral text,
  valor_declarado numeric(12,2),
  -- Datos enriquecidos del Catastro
  catastro_direccion text,
  catastro_provincia text,
  catastro_municipio text,
  catastro_superficie numeric(10,2),
  catastro_uso text,
  catastro_anio_construccion int,
  catastro_raw_data jsonb,
  -- Valor de referencia y contingencia fiscal
  valor_referencia numeric(12,2),
  desviacion_fiscal numeric(5,2),
  alerta_fiscal boolean default false,
  catastro_consultado boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_properties_deed_id on properties(deed_id);
create index if not exists idx_properties_ref_catastral on properties(referencia_catastral);
