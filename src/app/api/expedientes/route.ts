import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: listar expedientes del usuario
export const GET = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("expedientes")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expedientes: data });
  } catch (error) {
    console.error("Error fetching expedientes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};

// POST: crear nuevo expediente
export const POST = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { numero_expediente, titulo, cliente, tipo_causa, descripcion } = body;

    if (!numero_expediente || !titulo) {
      return NextResponse.json(
        { error: "numero_expediente y titulo son requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("expedientes")
      .insert({
        user_id: user.id,
        numero_expediente,
        titulo,
        cliente: cliente || null,
        tipo_causa: tipo_causa || "otro",
        descripcion: descripcion || null,
        estado: "abierto",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expediente: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating expediente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};
