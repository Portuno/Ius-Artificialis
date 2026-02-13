-- Herederos extraidos de escrituras
create table if not exists heirs (
  id uuid primary key default gen_random_uuid(),
  deed_id uuid references inheritance_deeds(id) on delete cascade not null,
  nombre text not null,
  rol text,
  dni text,
  porcentaje numeric(5,2),
  created_at timestamptz default now()
);

create index if not exists idx_heirs_deed_id on heirs(deed_id);
