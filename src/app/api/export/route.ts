import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export const POST = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { format, document_ids, expediente_ids } = await request.json();

    // Fetch validated documents
    let query = supabase
      .from("documents")
      .select("*")
      .eq("status", "validated")
      .order("created_at", { ascending: false });

    if (document_ids && document_ids.length > 0) {
      query = query.in("id", document_ids);
    }

    if (expediente_ids && expediente_ids.length > 0) {
      query = query.in("expediente_id", expediente_ids);
    }

    const { data: documents } = await query;

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: "No hay documentos validados para exportar" },
        { status: 404 }
      );
    }

    // Fetch all related data
    const docIds = documents.map((d) => d.id);

    const { data: invoices } = await supabase
      .from("invoices")
      .select("*")
      .in("document_id", docIds)
      .eq("validated", true);

    const { data: deeds } = await supabase
      .from("inheritance_deeds")
      .select("*")
      .in("document_id", docIds)
      .eq("validated", true);

    const deedIds = (deeds ?? []).map((d) => d.id);

    const { data: heirs } = deedIds.length > 0
      ? await supabase.from("heirs").select("*").in("deed_id", deedIds)
      : { data: [] };

    const { data: properties } = deedIds.length > 0
      ? await supabase.from("properties").select("*").in("deed_id", deedIds)
      : { data: [] };

    // JSON format
    if (format === "json") {
      const exportData = {
        export_date: new Date().toISOString(),
        total_documents: documents.length,
        invoices: (invoices ?? []).map((inv) => ({
          document: inv.document_id,
          emisor: inv.emisor,
          cif: inv.cif,
          numero_factura: inv.numero_factura,
          fecha: inv.fecha,
          base_imponible: inv.base_imponible,
          tipos_iva: inv.tipos_iva,
          total: inv.total,
          concepto: inv.concepto,
          items: (inv as any).items ?? [],
        })),
        inheritance_deeds: (deeds ?? []).map((deed) => ({
          document: deed.document_id,
          causante: deed.causante,
          fecha_fallecimiento: deed.fecha_fallecimiento,
          notario: deed.notario,
          protocolo: deed.protocolo,
          herederos: (heirs ?? [])
            .filter((h) => h.deed_id === deed.id)
            .map((h) => ({
              nombre: h.nombre,
              rol: h.rol,
              dni: h.dni,
              porcentaje: h.porcentaje,
            })),
          bienes_inmuebles: (properties ?? [])
            .filter((p) => p.deed_id === deed.id)
            .map((p) => ({
              descripcion: p.descripcion,
              referencia_catastral: p.referencia_catastral,
              valor_declarado: p.valor_declarado,
              valor_referencia: p.valor_referencia,
              desviacion_fiscal: p.desviacion_fiscal,
              alerta_fiscal: p.alerta_fiscal,
              catastro_direccion: p.catastro_direccion,
              catastro_superficie: p.catastro_superficie,
              catastro_uso: p.catastro_uso,
            })),
        })),
      };

      return NextResponse.json(exportData);
    }

    // Excel format
    if (format === "excel") {
      const wb = XLSX.utils.book_new();

      // Invoices sheet
      if (invoices && invoices.length > 0) {
        const invoiceRows = invoices.map((inv) => ({
          Emisor: inv.emisor ?? "",
          CIF: inv.cif ?? "",
          "N.º Factura": inv.numero_factura ?? "",
          Fecha: inv.fecha ?? "",
          "Base Imponible": inv.base_imponible ?? "",
          Total: inv.total ?? "",
          Concepto: inv.concepto ?? "",
        }));
        const ws = XLSX.utils.json_to_sheet(invoiceRows);
        XLSX.utils.book_append_sheet(wb, ws, "Facturas");

        const itemRows = invoices.flatMap((inv) => {
          const items = Array.isArray((inv as any).items) ? (inv as any).items : [];
          return items.map((item: any) => ({
            "Factura ID": inv.id,
            Documento: inv.document_id,
            Emisor: inv.emisor ?? "",
            "N.º Factura": inv.numero_factura ?? "",
            Fecha: inv.fecha ?? "",
            Descripción: item?.descripcion?.value ?? "",
            Cantidad: item?.cantidad?.value ?? "",
            Unidad: item?.unidad?.value ?? "",
            "Precio Unitario": item?.precio_unitario?.value ?? "",
            Importe: item?.importe?.value ?? "",
          }));
        });

        if (itemRows.length > 0) {
          const wsItems = XLSX.utils.json_to_sheet(itemRows);
          XLSX.utils.book_append_sheet(wb, wsItems, "ItemsFactura");
        }
      }

      // Deeds sheet
      if (deeds && deeds.length > 0) {
        const deedRows = deeds.map((deed) => ({
          Causante: deed.causante ?? "",
          "Fecha Fallecimiento": deed.fecha_fallecimiento ?? "",
          Notario: deed.notario ?? "",
          Protocolo: deed.protocolo ?? "",
        }));
        const ws = XLSX.utils.json_to_sheet(deedRows);
        XLSX.utils.book_append_sheet(wb, ws, "Escrituras");
      }

      // Heirs sheet
      if (heirs && heirs.length > 0) {
        const heirRows = heirs.map((h) => ({
          Nombre: h.nombre ?? "",
          Rol: h.rol ?? "",
          DNI: h.dni ?? "",
          Porcentaje: h.porcentaje ?? "",
        }));
        const ws = XLSX.utils.json_to_sheet(heirRows);
        XLSX.utils.book_append_sheet(wb, ws, "Herederos");
      }

      // Properties sheet
      if (properties && properties.length > 0) {
        const propRows = properties.map((p) => ({
          Descripción: p.descripcion ?? "",
          "Ref. Catastral": p.referencia_catastral ?? "",
          "Valor Declarado": p.valor_declarado ?? "",
          "Valor Referencia": p.valor_referencia ?? "",
          "Desviación %": p.desviacion_fiscal ?? "",
          "Alerta Fiscal": p.alerta_fiscal ? "SÍ" : "NO",
          "Dirección Catastro": p.catastro_direccion ?? "",
          "Superficie m²": p.catastro_superficie ?? "",
          Uso: p.catastro_uso ?? "",
        }));
        const ws = XLSX.utils.json_to_sheet(propRows);
        XLSX.utils.book_append_sheet(wb, ws, "Inmuebles");
      }

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="ius_artificialis_export_${Date.now()}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: "Formato no soportado" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Error al exportar" },
      { status: 500 }
    );
  }
};
