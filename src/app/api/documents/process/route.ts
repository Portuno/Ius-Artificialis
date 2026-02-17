import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyDocument } from "@/lib/gemini/classify";
import { extractInvoices } from "@/lib/gemini/extract-invoice";
import { extractDeed } from "@/lib/gemini/extract-deed";

export const maxDuration = 60;

export const POST = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_GEMINI_API_KEY no está configurada en el servidor. Añádela en Vercel: Project Settings > Environment Variables.",
        },
        { status: 503 }
      );
    }

    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json(
        { error: "document_id es requerido" },
        { status: 400 }
      );
    }

    // Fetch document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", document_id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("documents")
        .update({
          status: "error",
          error_message: "No se pudo descargar el archivo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id);
      return NextResponse.json(
        { error: "No se pudo descargar el archivo" },
        { status: 500 }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = fileData.type || "application/pdf";

    // Auto-create timeline event for document upload (if linked to expediente)
    if (doc.expediente_id) {
      await supabase.from("timeline_events").insert({
        expediente_id: doc.expediente_id,
        document_id,
        fecha: new Date().toISOString().split("T")[0],
        titulo: `Documento subido: ${doc.file_name}`,
        descripcion: null,
        tipo_evento: "documento_subido",
      });
    }

    // Step 1: Classify
    const classification = await classifyDocument(base64, mimeType);

    await supabase
      .from("documents")
      .update({
        doc_type: classification.document_type,
        classification_confidence: classification.confidence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    // Step 2: Extract based on type
    if (classification.document_type === "factura") {
      const extractions = await extractInvoices(base64, mimeType);
      const toInsert =
        extractions.length === 0
          ? [
              {
                emisor: { value: null as string | null, confidence: 0 },
                cif: { value: null as string | null, confidence: 0 },
                numero_factura: { value: null as string | null, confidence: 0 },
                fecha: { value: null as string | null, confidence: 0 },
                items: [] as unknown[],
                base_imponible: { value: null as number | null, confidence: 0 },
                tipos_iva: [] as { porcentaje: number; importe: number }[],
                total: { value: null as number | null, confidence: 0 },
                concepto: { value: null as string | null, confidence: 0 },
                page_number: null as number | null,
              },
            ]
          : extractions;

      for (let idx = 0; idx < toInsert.length; idx++) {
        const extraction = toInsert[idx];

        const sanitizedTiposIva = (extraction.tipos_iva ?? []).filter(
          (entry: any) =>
            typeof entry?.porcentaje === "number" &&
            Number.isFinite(entry.porcentaje) &&
            typeof entry?.importe === "number" &&
            Number.isFinite(entry.importe)
        );

        const itemConfidences: number[] = (extraction.items ?? []).flatMap(
          (item: any) => [
            item?.descripcion?.confidence,
            item?.cantidad?.confidence,
            item?.unidad?.confidence,
            item?.precio_unitario?.confidence,
            item?.importe?.confidence,
          ]
        ).filter((n: unknown): n is number => typeof n === "number");

        const itemsMinConfidence =
          itemConfidences.length > 0 ? Math.min(...itemConfidences) : 0;

        const confidenceScores: Record<string, number> = {
          emisor: extraction.emisor.confidence,
          cif: extraction.cif.confidence,
          fecha: extraction.fecha.confidence,
          base_imponible: extraction.base_imponible.confidence,
          total: extraction.total.confidence,
          concepto: extraction.concepto.confidence,
          numero_factura: extraction.numero_factura.confidence,
          items_min_confidence: itemsMinConfidence,
        };

        // Use page_number from extraction if available, otherwise fallback to index + 1
        // This provides a reasonable default even if Gemini couldn't determine the page
        const pageNumber =
          extraction.page_number != null ? extraction.page_number : idx + 1;

        const insertPayload = {
          document_id,
          user_id: user.id,
          emisor: extraction.emisor.value,
          cif: extraction.cif.value,
          fecha: extraction.fecha.value,
          base_imponible: extraction.base_imponible.value,
          tipos_iva: sanitizedTiposIva,
          total: extraction.total.value,
          concepto: extraction.concepto.value,
          numero_factura: extraction.numero_factura.value,
          page_number: pageNumber,
          confidence_scores: confidenceScores,
          items: extraction.items ?? [],
        };

        const { error: insertError } = await supabase
          .from("invoices")
          .insert(insertPayload);

        // Backward-compat fallback (if migration not applied yet): retry without items.
        if (insertError) {
          const message = insertError.message ?? "";
          const isMissingItemsColumn =
            message.includes("items") &&
            (message.toLowerCase().includes("column") ||
              message.toLowerCase().includes("does not exist"));

          if (isMissingItemsColumn) {
            const { items: _items, ...withoutItems } = insertPayload as any;
            await supabase.from("invoices").insert(withoutItems);
          }
        }
      }

      // Auto-generate sujetos and timeline for expediente (dedupe emisores by CIF then nombre)
      if (doc.expediente_id && toInsert.length > 0) {
        const seenEmisores = new Set<string>();
        const timelineEvents: {
          expediente_id: string;
          document_id: string;
          fecha: string;
          titulo: string;
          descripcion: string | null;
          tipo_evento: "fecha_factura";
        }[] = [];

        for (const extraction of toInsert) {
          const key =
            (extraction.cif.value ?? "") + "|" + (extraction.emisor.value ?? "");
          if (extraction.emisor.value && !seenEmisores.has(key)) {
            seenEmisores.add(key);
            await supabase.from("sujetos").insert({
              expediente_id: doc.expediente_id,
              nombre_completo: extraction.emisor.value,
              tipo_persona: "juridica",
              dni_cif: extraction.cif.value || null,
              rol_procesal: "emisor",
              datos_extra: { source: "factura", document_id },
            });
          }
          if (extraction.fecha.value) {
            timelineEvents.push({
              expediente_id: doc.expediente_id,
              document_id,
              fecha: extraction.fecha.value,
              titulo: `Factura ${extraction.numero_factura.value || "S/N"}`,
              descripcion: `Factura de ${extraction.emisor.value || "emisor desconocido"} por ${extraction.total.value != null ? extraction.total.value + "€" : "importe desconocido"}`,
              tipo_evento: "fecha_factura",
            });
          }
        }
        if (timelineEvents.length > 0) {
          await supabase.from("timeline_events").insert(timelineEvents);
        }
      }

      await supabase
        .from("documents")
        .update({
          status: "extracted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id);

      return NextResponse.json({
        success: true,
        type: "factura",
        classification,
        extractionCount: toInsert.length,
      });
    }

    if (classification.document_type === "escritura_herencia") {
      const extraction = await extractDeed(base64, mimeType);

      const confidenceScores: Record<string, number> = {
        causante: extraction.causante.confidence,
        fecha_fallecimiento: extraction.fecha_fallecimiento.confidence,
        notario: extraction.notario.confidence,
        protocolo: extraction.protocolo.confidence,
        fecha_escritura: extraction.fecha_escritura.confidence,
      };

      // Insert deed
      const { data: deed } = await supabase
        .from("inheritance_deeds")
        .insert({
          document_id,
          user_id: user.id,
          causante: extraction.causante.value,
          fecha_fallecimiento: extraction.fecha_fallecimiento.value,
          notario: extraction.notario.value,
          protocolo: extraction.protocolo.value,
          fecha_escritura: extraction.fecha_escritura.value,
          confidence_scores: confidenceScores,
        })
        .select()
        .single();

      if (deed) {
        // Insert heirs
        if (extraction.herederos.length > 0) {
          await supabase.from("heirs").insert(
            extraction.herederos.map((h) => ({
              deed_id: deed.id,
              nombre: h.nombre,
              rol: h.rol,
              dni: h.dni,
              porcentaje: h.porcentaje,
            }))
          );
        }

        // Insert properties
        if (extraction.bienes_inmuebles.length > 0) {
          await supabase.from("properties").insert(
            extraction.bienes_inmuebles.map((p) => ({
              deed_id: deed.id,
              descripcion: p.descripcion,
              referencia_catastral: p.referencia_catastral,
              valor_declarado: p.valor_declarado,
            }))
          );
        }

        // Auto-generate sujetos and timeline for expediente
        if (doc.expediente_id) {
          // Create sujeto for causante
          if (extraction.causante.value) {
            await supabase.from("sujetos").insert({
              expediente_id: doc.expediente_id,
              nombre_completo: extraction.causante.value,
              tipo_persona: "fisica",
              rol_procesal: "causante",
              datos_extra: { source: "escritura_herencia", document_id },
            });
          }

          // Create sujetos for herederos
          if (extraction.herederos.length > 0) {
            await supabase.from("sujetos").insert(
              extraction.herederos.map((h) => ({
                expediente_id: doc.expediente_id,
                nombre_completo: h.nombre,
                tipo_persona: "fisica" as const,
                dni_cif: h.dni || null,
                rol_procesal: "heredero" as const,
                datos_extra: {
                  source: "escritura_herencia",
                  document_id,
                  rol_original: h.rol,
                  porcentaje: h.porcentaje,
                },
              }))
            );
          }

          // Create sujeto for notario
          if (extraction.notario.value) {
            await supabase.from("sujetos").insert({
              expediente_id: doc.expediente_id,
              nombre_completo: extraction.notario.value,
              tipo_persona: "fisica",
              rol_procesal: "notario",
              datos_extra: { source: "escritura_herencia", document_id },
            });
          }

          // Create timeline events
          const timelineEvents = [];

          if (extraction.fecha_fallecimiento.value) {
            timelineEvents.push({
              expediente_id: doc.expediente_id,
              document_id,
              fecha: extraction.fecha_fallecimiento.value,
              titulo: `Fallecimiento de ${extraction.causante.value || "causante"}`,
              descripcion: null,
              tipo_evento: "fecha_fallecimiento",
            });
          }

          if (extraction.fecha_escritura.value) {
            timelineEvents.push({
              expediente_id: doc.expediente_id,
              document_id,
              fecha: extraction.fecha_escritura.value,
              titulo: `Escritura de herencia${extraction.protocolo.value ? ` (Prot. ${extraction.protocolo.value})` : ""}`,
              descripcion: `Notario: ${extraction.notario.value || "desconocido"}`,
              tipo_evento: "fecha_escritura",
            });
          }

          if (timelineEvents.length > 0) {
            await supabase.from("timeline_events").insert(timelineEvents);
          }
        }
      }

      await supabase
        .from("documents")
        .update({
          status: "extracted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id);

      return NextResponse.json({
        success: true,
        type: "escritura_herencia",
        classification,
        extraction,
      });
    }

    // For other document types, just save classification
    await supabase
      .from("documents")
      .update({
        status: "extracted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    return NextResponse.json({
      success: true,
      type: classification.document_type,
      classification,
    });
  } catch (error) {
    console.error("Processing error:", error);

    // Try to update document status to error
    try {
      const { document_id } = await request.clone().json();
      if (document_id) {
        const supabase = await createClient();
        await supabase
          .from("documents")
          .update({
            status: "error",
            error_message:
              error instanceof Error ? error.message : "Error desconocido",
            updated_at: new Date().toISOString(),
          })
          .eq("id", document_id);
      }
    } catch {
      // Ignore cleanup errors
    }

    const message =
      error instanceof Error ? error.message : "Error procesando documento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
