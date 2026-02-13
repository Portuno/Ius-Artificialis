-- Página del PDF donde se detectó la factura, para UX del visor (ej. #page=N).
alter table invoices add column if not exists page_number integer;
