"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const ExportPage = () => {
  const [validatedCount, setValidatedCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [deedCount, setDeedCount] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);

  const loadCounts = useCallback(async () => {
    const supabase = createClient();

    const { count: docCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("status", "validated");

    const { count: invCount } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("validated", true);

    const { count: dCount } = await supabase
      .from("inheritance_deeds")
      .select("*", { count: "exact", head: true })
      .eq("validated", true);

    const { count: propCount } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true });

    setValidatedCount(docCount ?? 0);
    setInvoiceCount(invCount ?? 0);
    setDeedCount(dCount ?? 0);
    setPropertyCount(propCount ?? 0);
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const data = await res.json();
      setJsonPreview(JSON.stringify(data, null, 2));

      // Also download as file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ius_artificialis_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Datos exportados en JSON");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al exportar"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "excel" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ius_artificialis_export_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Datos exportados en Excel");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al exportar"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Exportar Datos
        </h2>
        <p className="text-muted-foreground">
          Exporta los datos validados en JSON o Excel para integración con
          tu ERP o sistemas de gestión.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{validatedCount}</p>
          <p className="text-xs text-muted-foreground">Docs Validados</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{invoiceCount}</p>
          <p className="text-xs text-muted-foreground">Facturas</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{deedCount}</p>
          <p className="text-xs text-muted-foreground">Escrituras</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{propertyCount}</p>
          <p className="text-xs text-muted-foreground">Inmuebles</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleExportJSON}
          disabled={isExporting || validatedCount === 0}
          className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-50"
          aria-label="Exportar como JSON"
          tabIndex={0}
        >
          {isExporting ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <FileJson className="h-10 w-10 text-primary" />
          )}
          <div>
            <p className="font-medium">Exportar JSON</p>
            <p className="text-xs text-muted-foreground">
              Formato estructurado para integración API
            </p>
          </div>
        </button>

        <button
          onClick={handleExportExcel}
          disabled={isExporting || validatedCount === 0}
          className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center transition-colors hover:border-success/50 hover:bg-muted/50 disabled:opacity-50"
          aria-label="Exportar como Excel"
          tabIndex={0}
        >
          {isExporting ? (
            <Loader2 className="h-10 w-10 animate-spin text-success" />
          ) : (
            <FileSpreadsheet className="h-10 w-10 text-success" />
          )}
          <div>
            <p className="font-medium">Exportar Excel</p>
            <p className="text-xs text-muted-foreground">
              Hojas separadas por tipo de dato
            </p>
          </div>
        </button>
      </div>

      {validatedCount === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          No hay documentos validados para exportar. Primero valida los
          documentos extraídos desde la cola de validación.
        </div>
      )}

      {/* JSON Preview */}
      {jsonPreview && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Vista Previa JSON</h3>
          <pre className="max-h-[400px] overflow-auto rounded-lg bg-foreground/5 p-4 text-xs">
            {jsonPreview}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ExportPage;
