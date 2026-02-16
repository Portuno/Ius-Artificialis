"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  FileJson,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  FolderOpen,
  ListFilter,
} from "lucide-react";
import type { Expediente } from "@/types/database";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ExportFilterMode = "all" | "expedientes";

const ExportPage = () => {
  const [validatedCount, setValidatedCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [deedCount, setDeedCount] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [filterMode, setFilterMode] = useState<ExportFilterMode>("all");
  const [selectedExpedienteIds, setSelectedExpedienteIds] = useState<string[]>(
    []
  );

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

  const loadExpedientes = useCallback(async () => {
    try {
      const res = await fetch("/api/expedientes");
      const data = await res.json();
      if (data.expedientes) {
        setExpedientes(data.expedientes);
      }
    } catch {
      setExpedientes([]);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadExpedientes();
  }, [loadExpedientes]);

  const getExportBody = () => {
    const base: { format: string; expediente_ids?: string[] } = {
      format: "json",
    };
    if (filterMode === "expedientes" && selectedExpedienteIds.length > 0) {
      base.expediente_ids = selectedExpedienteIds;
    }
    return base;
  };

  const canExport =
    validatedCount > 0 &&
    (filterMode === "all" ||
      (filterMode === "expedientes" && selectedExpedienteIds.length > 0));

  const handleToggleExpediente = (expedienteId: string) => {
    setSelectedExpedienteIds((prev) =>
      prev.includes(expedienteId)
        ? prev.filter((id) => id !== expedienteId)
        : [...prev, expedienteId]
    );
  };

  const handleSelectAllExpedientes = () => {
    if (selectedExpedienteIds.length === expedientes.length) {
      setSelectedExpedienteIds([]);
    } else {
      setSelectedExpedienteIds(expedientes.map((e) => e.id));
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const body = { ...getExportBody(), format: "json" };
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      const body = { ...getExportBody(), format: "excel" };
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      {/* Filter: Todos vs por expedientes */}
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <ListFilter className="h-4 w-4" aria-hidden />
          Filtrar datos a exportar
        </h3>
        <div className="flex flex-wrap gap-4">
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
              filterMode === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input hover:bg-muted/50"
            )}
          >
            <input
              type="radio"
              name="export-filter"
              checked={filterMode === "all"}
              onChange={() => setFilterMode("all")}
              className="sr-only"
              aria-label="Exportar todos los datos"
            />
            <FolderOpen className="h-4 w-4" aria-hidden />
            Todos
          </label>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
              filterMode === "expedientes"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input hover:bg-muted/50"
            )}
          >
            <input
              type="radio"
              name="export-filter"
              checked={filterMode === "expedientes"}
              onChange={() => setFilterMode("expedientes")}
              className="sr-only"
              aria-label="Exportar por expedientes seleccionados"
            />
            <ListFilter className="h-4 w-4" aria-hidden />
            Por expedientes
          </label>
        </div>

        {filterMode === "expedientes" && (
          <div className="space-y-2">
            {expedientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay expedientes. Crea expedientes y asocia documentos para
                filtrar por ellos.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">
                    Selecciona uno o más expedientes
                  </Label>
                  <button
                    type="button"
                    onClick={handleSelectAllExpedientes}
                    className="text-xs text-primary hover:underline"
                    aria-label={
                      selectedExpedienteIds.length === expedientes.length
                        ? "Quitar todos"
                        : "Seleccionar todos los expedientes"
                    }
                  >
                    {selectedExpedienteIds.length === expedientes.length
                      ? "Quitar todos"
                      : "Seleccionar todos"}
                  </button>
                </div>
                <ScrollArea className="h-[180px] rounded-md border border-input p-2">
                  <ul className="space-y-1" role="group" aria-label="Expedientes disponibles">
                    {expedientes.map((exp) => (
                      <li key={exp.id}>
                        <label
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggleExpediente(exp.id);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedExpedienteIds.includes(exp.id)}
                            onChange={() => handleToggleExpediente(exp.id)}
                            className="h-4 w-4 rounded border-input"
                            aria-label={`Expediente ${exp.numero_expediente} - ${exp.titulo}`}
                          />
                          <span className="truncate">
                            {exp.numero_expediente} — {exp.titulo}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </>
            )}
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleExportJSON}
          disabled={isExporting || !canExport}
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
          disabled={isExporting || !canExport}
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

      {!canExport && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {validatedCount === 0
            ? "No hay documentos validados para exportar. Primero valida los documentos extraídos desde la cola de validación."
            : filterMode === "expedientes" &&
                selectedExpedienteIds.length === 0
              ? "Selecciona al menos un expediente para exportar."
              : "No hay datos que exportar con el filtro actual."}
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
