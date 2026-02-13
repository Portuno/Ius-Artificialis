-- Habilitar Row Level Security en todas las tablas
alter table documents enable row level security;
alter table invoices enable row level security;
alter table inheritance_deeds enable row level security;
alter table heirs enable row level security;
alter table properties enable row level security;

-- Documents: acceso directo por user_id
create policy "Users manage own documents" on documents
  for all using (auth.uid() = user_id);

-- Invoices: acceso directo por user_id
create policy "Users manage own invoices" on invoices
  for all using (auth.uid() = user_id);

-- Inheritance Deeds: acceso directo por user_id
create policy "Users manage own deeds" on inheritance_deeds
  for all using (auth.uid() = user_id);

-- Heirs: acceso via deed -> documents
create policy "Users manage own heirs" on heirs
  for all using (
    deed_id in (
      select id from inheritance_deeds where user_id = auth.uid()
    )
  );

-- Properties: acceso via deed -> documents
create policy "Users manage own properties" on properties
  for all using (
    deed_id in (
      select id from inheritance_deeds where user_id = auth.uid()
    )
  );
