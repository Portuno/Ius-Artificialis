-- Agregar columna expediente_id a documents para vincular documentos a expedientes
-- Nullable para backward compatibility con documentos existentes

alter table documents
  add column if not exists expediente_id uuid references expedientes(id) on delete set null;

-- Indice para busquedas por expediente
create index if not exists idx_documents_expediente_id on documents(expediente_id);
