import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryCatastro, estimateReferenceValue } from "@/lib/catastro/client";

export const POST = async (request: Request) => {
  const isDev = process.env.NODE_ENV !== "production";
  let step: string = "init";
  try {
    const supabase = await createClient();
    let user: unknown = null;
    try {
      step = "auth.getUser";
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (isDev) console.error("[catastro/query] getUser error:", error);
        return NextResponse.json(
          {
            error: "Sesión inválida. Vuelve a iniciar sesión.",
            ...(isDev ? { step, details: error.message ?? String(error) } : {}),
          },
          { status: 401 }
        );
      }
      user = data.user;
    } catch {
      return NextResponse.json(
        { error: "Sesión inválida. Vuelve a iniciar sesión.", ...(isDev ? { step } : {}) },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    step = "request.json";
    const { property_id, referencia_catastral } = await request.json();

    if (!referencia_catastral) {
      return NextResponse.json(
        { error: "referencia_catastral es requerida" },
        { status: 400 }
      );
    }

    // Query servicio oficial Catastro (ovc.catastro.meh.es) — gratuito, sin API key
    step = "catastro.query";
    const result = await queryCatastro(referencia_catastral);

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: result.error ?? "Error al consultar el Catastro",
          ...(isDev ? { step } : {}),
        },
        { status: 503 }
      );
    }

    // Estimate reference value
    step = "catastro.estimate";
    const valorReferencia = estimateReferenceValue(result.data);

    // If we have a property_id, update the database
    if (property_id) {
      // Get current property to calculate deviation
      step = "db.read_property";
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("valor_declarado")
        .eq("id", property_id)
        .single();

      if (propertyError) {
        if (isDev) console.error("[catastro/query] read_property error:", propertyError);
        return NextResponse.json(
          {
            error: `No se pudo leer la propiedad: ${propertyError.message}`,
            ...(isDev ? { step, details: propertyError } : {}),
          },
          { status: 500 }
        );
      }

      let desviacionFiscal: number | null = null;
      let alertaFiscal = false;

      const valorDeclaradoRaw = (property as any)?.valor_declarado ?? null;
      const valorDeclarado =
        typeof valorDeclaradoRaw === "number"
          ? valorDeclaradoRaw
          : typeof valorDeclaradoRaw === "string"
            ? Number.parseFloat(valorDeclaradoRaw)
            : null;

      const round2 = (n: number) => Math.round(n * 100) / 100;
      const clamp = (n: number, min: number, max: number) =>
        Math.min(max, Math.max(min, n));

      if (valorDeclarado != null && Number.isFinite(valorDeclarado) && valorDeclarado > 0 && valorReferencia) {
        const desviacionReal =
          ((valorReferencia - valorDeclarado) / valorDeclarado) * 100;

        // `properties.desviacion_fiscal` es numeric(5,2) → rango aprox [-999.99, 999.99]
        // Para evitar error 22003 (out of range), clamp/round al rango soportado.
        desviacionFiscal = round2(clamp(desviacionReal, -999.99, 999.99));

        // Alert if the reference value is >20% higher than declared
        alertaFiscal = desviacionReal > 20;
      }

      const rawDataWithExtras: Record<string, unknown> = {
        ...result.data.raw_data,
        tipo_bien: result.data.tipo_bien,
        domicilio_tributario: result.data.domicilio_tributario,
        bloque: result.data.bloque,
        escalera: result.data.escalera,
        planta: result.data.planta,
        puerta: result.data.puerta,
        coeficiente_participacion: result.data.coeficiente_participacion,
        num_unidades_constructivas: result.data.num_unidades_constructivas,
        // Guardamos el valor real (sin clamp) para debug/auditoría (si aplica)
        desviacion_fiscal_real:
          valorDeclarado != null &&
          Number.isFinite(valorDeclarado) &&
          valorDeclarado > 0 &&
          valorReferencia
            ? ((valorReferencia - valorDeclarado) / valorDeclarado) * 100
            : null,
      };

      step = "db.update_property";
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          catastro_direccion: result.data.direccion,
          catastro_provincia: result.data.provincia,
          catastro_municipio: result.data.municipio,
          catastro_superficie: result.data.superficie,
          catastro_uso: result.data.uso,
          catastro_anio_construccion: result.data.anio_construccion,
          catastro_raw_data: rawDataWithExtras,
          valor_referencia: valorReferencia,
          desviacion_fiscal: desviacionFiscal,
          alerta_fiscal: alertaFiscal,
          catastro_consultado: true,
        })
        .eq("id", property_id);

      if (updateError) {
        if (isDev) console.error("[catastro/query] update_property error:", updateError);
        return NextResponse.json(
          {
            error: `No se pudo guardar la consulta de Catastro: ${updateError.message}`,
            ...(isDev ? { step, details: updateError } : {}),
          },
          { status: 500 }
        );
      }
    }

    step = "response.ok";
    return NextResponse.json({
      success: true,
      catastro: result.data,
      valor_referencia: valorReferencia,
    });
  } catch (error) {
    console.error("Catastro query error:", error);
    const message =
      error instanceof Error ? error.message : "Error al consultar el Catastro";
    return NextResponse.json(
      {
        error: message,
        ...(isDev
          ? {
              step,
              stack: error instanceof Error ? error.stack : undefined,
            }
          : {}),
      },
      { status: 500 }
    );
  }
};
