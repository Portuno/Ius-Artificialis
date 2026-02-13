-- Bucket para almacenar documentos subidos
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Politica: usuarios solo suben en su propia carpeta (user_id/filename)
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politica: usuarios solo ven sus propios archivos
create policy "Users can view own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politica: usuarios solo borran sus propios archivos
create policy "Users can delete own documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
