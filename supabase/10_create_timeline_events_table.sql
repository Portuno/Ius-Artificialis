-- Tabla de eventos de la línea de tiempo del expediente
-- Algunos se generan automáticamente al procesar documentos, otros son manuales

create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade not null,
  document_id uuid references documents(id) on delete set null,
  fecha date not null,
  titulo text not null,
  descripcion text,
  tipo_evento text not null default 'hito_manual' check (tipo_evento in ('documento_subido', 'fecha_fallecimiento', 'fecha_escritura', 'fecha_factura', 'vencimiento', 'hito_manual')),
  created_at timestamptz default now()
);

-- Indices
create index if not exists idx_timeline_events_expediente_id on timeline_events(expediente_id);
create index if not exists idx_timeline_events_fecha on timeline_events(fecha);
