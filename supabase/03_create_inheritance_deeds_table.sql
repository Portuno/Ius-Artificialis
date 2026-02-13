-- Datos extraidos de escrituras de herencia
create table if not exists inheritance_deeds (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  causante text,
  fecha_fallecimiento date,
  notario text,
  protocolo text,
  fecha_escritura date,
  confidence_scores jsonb default '{}'::jsonb,
  validated boolean default false,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_deeds_document_id on inheritance_deeds(document_id);
create index if not exists idx_deeds_user_id on inheritance_deeds(user_id);
