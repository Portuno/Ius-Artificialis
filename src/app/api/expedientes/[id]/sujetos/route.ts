import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: crear sujeto en un expediente
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
    const {
      nombre_completo,
      tipo_persona,
      dni_cif,
      rol_procesal,
      contacto_email,
      contacto_telefono,
      direccion,
      datos_extra,
    } = body;

    if (!nombre_completo) {
      return NextResponse.json(
        { error: "nombre_completo es requerido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("sujetos")
      .insert({
        expediente_id,
        nombre_completo,
        tipo_persona: tipo_persona || "fisica",
        dni_cif: dni_cif || null,
        rol_procesal: rol_procesal || "otro",
        contacto_email: contacto_email || null,
        contacto_telefono: contacto_telefono || null,
        direccion: direccion || null,
        datos_extra: datos_extra || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sujeto: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating sujeto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};

// DELETE: eliminar sujeto
export const DELETE = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { sujeto_id } = await request.json();

    if (!sujeto_id) {
      return NextResponse.json(
        { error: "sujeto_id es requerido" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("sujetos")
      .delete()
      .eq("id", sujeto_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sujeto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};
