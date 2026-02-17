-- Añade desglose de líneas (items) extraídas de la factura.
-- Se guarda como JSONB para acelerar iteración (HITL + export).
alter table invoices
  add column if not exists items jsonb default '[]'::jsonb;

