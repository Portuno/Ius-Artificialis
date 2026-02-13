import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryCatastro, estimateReferenceValue } from "@/lib/catastro/client";

export const POST = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { property_id, referencia_catastral } = await request.json();

    if (!referencia_catastral) {
      return NextResponse.json(
        { error: "referencia_catastral es requerida" },
        { status: 400 }
      );
    }

    // Query servicio oficial Catastro (ovc.catastro.meh.es) — gratuito, sin API key
    const result = await queryCatastro(referencia_catastral);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? "Error al consultar el Catastro" },
        { status: 503 }
      );
    }

    // Estimate reference value
    const valorReferencia = estimateReferenceValue(result.data);

    // If we have a property_id, update the database
    if (property_id) {
      // Get current property to calculate deviation
      const { data: property } = await supabase
        .from("properties")
        .select("valor_declarado")
        .eq("id", property_id)
        .single();

      let desviacionFiscal: number | null = null;
      let alertaFiscal = false;

      if (property?.valor_declarado && valorReferencia) {
        desviacionFiscal =
          ((valorReferencia - property.valor_declarado) /
            property.valor_declarado) *
          100;
        // Alert if the reference value is >20% higher than declared
        alertaFiscal = desviacionFiscal > 20;
      }

      await supabase
        .from("properties")
        .update({
          catastro_direccion: result.data.direccion,
          catastro_provincia: result.data.provincia,
          catastro_municipio: result.data.municipio,
          catastro_superficie: result.data.superficie,
          catastro_uso: result.data.uso,
          catastro_anio_construccion: result.data.anio_construccion,
          catastro_raw_data: result.data.raw_data,
          valor_referencia: valorReferencia,
          desviacion_fiscal: desviacionFiscal,
          alerta_fiscal: alertaFiscal,
          catastro_consultado: true,
        })
        .eq("id", property_id);
    }

    return NextResponse.json({
      success: true,
      catastro: result.data,
      valor_referencia: valorReferencia,
    });
  } catch (error) {
    console.error("Catastro query error:", error);
    return NextResponse.json(
      { error: "Error al consultar el Catastro" },
      { status: 500 }
    );
  }
};
