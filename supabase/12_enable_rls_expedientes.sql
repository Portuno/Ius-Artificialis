-- Habilitar Row Level Security en las tablas nuevas
alter table expedientes enable row level security;
alter table sujetos enable row level security;
alter table timeline_events enable row level security;

-- Expedientes: acceso directo por user_id
create policy "Users manage own expedientes" on expedientes
  for all using (auth.uid() = user_id);

-- Sujetos: acceso via expediente -> user_id
create policy "Users manage own sujetos" on sujetos
  for all using (
    expediente_id in (
      select id from expedientes where user_id = auth.uid()
    )
  );

-- Timeline Events: acceso via expediente -> user_id
create policy "Users manage own timeline events" on timeline_events
  for all using (
    expediente_id in (
      select id from expedientes where user_id = auth.uid()
    )
  );
