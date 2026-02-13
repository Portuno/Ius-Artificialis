-- Datos extraidos de facturas
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emisor text,
  cif text,
  fecha date,
  base_imponible numeric(12,2),
  tipos_iva jsonb default '[]'::jsonb,
  total numeric(12,2),
  concepto text,
  numero_factura text,
  confidence_scores jsonb default '{}'::jsonb,
  validated boolean default false,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_invoices_document_id on invoices(document_id);
create index if not exists idx_invoices_user_id on invoices(user_id);
