import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const POST = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const expedienteIdRaw = formData.get("expediente_id") as string | null;
    const expedienteId = expedienteIdRaw && expedienteIdRaw !== "none" ? expedienteIdRaw : null;

    if (!files.length) {
      return NextResponse.json(
        { error: "No se proporcionaron archivos" },
        { status: 400 }
      );
    }

    const results = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        results.push({
          file_name: file.name,
          success: false,
          error: uploadError.message,
        });
        continue;
      }

      // Create document record
      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: fileExt,
          file_size: file.size,
          status: "pending",
          expediente_id: expedienteId,
        })
        .select()
        .single();

      if (dbError) {
        results.push({
          file_name: file.name,
          success: false,
          error: dbError.message,
        });
        continue;
      }

      results.push({
        file_name: file.name,
        success: true,
        document_id: doc.id,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
};
