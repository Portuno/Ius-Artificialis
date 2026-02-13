import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: obtener expediente con datos completos (documentos, sujetos, timeline, facturas, propiedades)
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Fetch expediente
    const { data: expediente, error: expError } = await supabase
      .from("expedientes")
      .select("*")
      .eq("id", id)
      .single();

    if (expError || !expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    // Fetch all related data in parallel
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

    // Fetch invoices and deeds for documents in this expediente
    const documentIds = (documentsRes.data ?? []).map((d) => d.id);

    let invoices: unknown[] = [];
    let deeds: unknown[] = [];
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
      deeds = deedsRes.data ?? [];

      // Fetch properties for these deeds
      const deedIds = (deedsRes.data ?? []).map((d) => d.id);
      if (deedIds.length > 0) {
        const propertiesRes = await supabase
          .from("properties")
          .select("*")
          .in("deed_id", deedIds);
        properties = propertiesRes.data ?? [];
      }
    }

    return NextResponse.json({
      expediente,
      documents: documentsRes.data ?? [],
      sujetos: sujetosRes.data ?? [],
      timeline: timelineRes.data ?? [],
      invoices,
      deeds,
      properties,
    });
  } catch (error) {
    console.error("Error fetching expediente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};

// PATCH: actualizar expediente
export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = [
      "titulo",
      "cliente",
      "tipo_causa",
      "estado",
      "descripcion",
      "notas",
      "numero_expediente",
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from("expedientes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expediente: data });
  } catch (error) {
    console.error("Error updating expediente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};

// DELETE: eliminar expediente
export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { error } = await supabase
      .from("expedientes")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expediente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};
