import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: crear evento de timeline en un expediente
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: expediente_id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verify expediente exists and belongs to user
    const { data: expediente } = await supabase
      .from("expedientes")
      .select("id")
      .eq("id", expediente_id)
      .single();

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { fecha, titulo, descripcion, tipo_evento, document_id } = body;

    if (!fecha || !titulo) {
      return NextResponse.json(
        { error: "fecha y titulo son requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("timeline_events")
      .insert({
        expediente_id,
        document_id: document_id || null,
        fecha,
        titulo,
        descripcion: descripcion || null,
        tipo_evento: tipo_evento || "hito_manual",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating timeline event:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};
