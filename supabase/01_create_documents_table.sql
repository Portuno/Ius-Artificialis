-- Tabla principal de documentos cargados
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  doc_type text,
  classification_confidence float,
  status text default 'pending' check (status in ('pending', 'processing', 'extracted', 'validated', 'error')),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indice para busquedas por usuario y estado
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_documents_status on documents(status);
create index if not exists idx_documents_doc_type on documents(doc_type);
