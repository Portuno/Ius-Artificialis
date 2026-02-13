import { createClient } from "@/lib/supabase/server";
import ExpedienteDetailClient from "./expediente-detail-client";
import type { Expediente } from "@/types/database";

interface ExpedienteDetailDataProps {
  id: string;
  expediente: Expediente;
}

const ExpedienteDetailData = async ({ id, expediente }: ExpedienteDetailDataProps) => {
  const supabase = await createClient();

  const [documentsRes, sujetosRes, timelineRes] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("expediente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sujetos")
      .select("*")
      .eq("expediente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("timeline_events")
      .select("*")
      .eq("expediente_id", id)
      .order("fecha", { ascending: true }),
  ]);

  const documentIds = (documentsRes.data ?? []).map((d) => d.id);
  let invoices: unknown[] = [];
  let properties: unknown[] = [];

  if (documentIds.length > 0) {
    const [invoicesRes, deedsRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("*")
        .in("document_id", documentIds),
      supabase
        .from("inheritance_deeds")
        .select("*")
        .in("document_id", documentIds),
    ]);

    invoices = invoicesRes.data ?? [];
    const deedIds = (deedsRes.data ?? []).map((d) => d.id);
    if (deedIds.length > 0) {
      const propertiesRes = await supabase
        .from("properties")
        .select("*")
        .in("deed_id", deedIds);
      properties = propertiesRes.data ?? [];
    }
  }

  return (
    <ExpedienteDetailClient
      expediente={expediente}
      initialDocuments={documentsRes.data ?? []}
      initialSujetos={sujetosRes.data ?? []}
      initialTimeline={timelineRes.data ?? []}
      initialInvoices={invoices}
      initialProperties={properties}
    />
  );
};

export default ExpedienteDetailData;
