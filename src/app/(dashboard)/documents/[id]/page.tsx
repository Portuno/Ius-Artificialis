import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import DocumentDetailClient from "./document-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const DocumentDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch document
  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  // Fetch related data based on document type
  let invoices: unknown[] = [];
  let deed = null;
  let heirs: unknown[] = [];
  let properties: unknown[] = [];

  if (document.doc_type === "factura") {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("document_id", id)
      .order("created_at", { ascending: true });
    invoices = data ?? [];
  }

  if (document.doc_type === "escritura_herencia") {
    const { data: deedData } = await supabase
      .from("inheritance_deeds")
      .select("*")
      .eq("document_id", id)
      .single();
    deed = deedData;

    if (deedData) {
      const { data: heirsData } = await supabase
        .from("heirs")
        .select("*")
        .eq("deed_id", deedData.id);
      heirs = heirsData ?? [];

      const { data: propertiesData } = await supabase
        .from("properties")
        .select("*")
        .eq("deed_id", deedData.id);
      properties = propertiesData ?? [];
    }
  }

  // Get file URL for preview
  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(document.file_path);

  // For private buckets, use signed URL
  const { data: signedUrlData } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, 3600);

  const fileUrl = signedUrlData?.signedUrl ?? publicUrl;

  return (
    <DocumentDetailClient
      document={document}
      invoices={invoices}
      deed={deed}
      heirs={heirs}
      properties={properties}
      fileUrl={fileUrl}
    />
  );
};

export default DocumentDetailPage;
