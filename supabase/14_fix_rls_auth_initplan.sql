-- Optimizar políticas RLS: usar (select auth.uid()) en lugar de auth.uid()
-- para que el valor se evalúe una vez por query y no por fila.
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- documents
drop policy if exists "Users manage own documents" on documents;
create policy "Users manage own documents" on documents
  for all using ((select auth.uid()) = user_id);

-- invoices
drop policy if exists "Users manage own invoices" on invoices;
create policy "Users manage own invoices" on invoices
  for all using ((select auth.uid()) = user_id);

-- inheritance_deeds
drop policy if exists "Users manage own deeds" on inheritance_deeds;
create policy "Users manage own deeds" on inheritance_deeds
  for all using ((select auth.uid()) = user_id);

-- heirs
drop policy if exists "Users manage own heirs" on heirs;
create policy "Users manage own heirs" on heirs
  for all using (
    deed_id in (
      select id from inheritance_deeds where user_id = (select auth.uid())
    )
  );

-- properties
drop policy if exists "Users manage own properties" on properties;
create policy "Users manage own properties" on properties
  for all using (
    deed_id in (
      select id from inheritance_deeds where user_id = (select auth.uid())
    )
  );

-- expedientes
drop policy if exists "Users manage own expedientes" on expedientes;
create policy "Users manage own expedientes" on expedientes
  for all using ((select auth.uid()) = user_id);

-- sujetos
drop policy if exists "Users manage own sujetos" on sujetos;
create policy "Users manage own sujetos" on sujetos
  for all using (
    expediente_id in (
      select id from expedientes where user_id = (select auth.uid())
    )
  );

-- timeline_events
drop policy if exists "Users manage own timeline events" on timeline_events;
create policy "Users manage own timeline events" on timeline_events
  for all using (
    expediente_id in (
      select id from expedientes where user_id = (select auth.uid())
    )
  );
