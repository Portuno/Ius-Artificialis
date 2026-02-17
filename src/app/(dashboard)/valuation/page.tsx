"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  MapPin,
  Loader2,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";
import type { Property } from "@/types/database";
import PropertyCatastroCard from "@/components/catastro/property-catastro-card";

const DELAY_BETWEEN_CATASTRO_MS = 400;

const ValuationPage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [queryingId, setQueryingId] = useState<string | null>(null);
  const lastLoadRequestIdRef = useRef(0);
  const [queryAllProgress, setQueryAllProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const loadProperties = useCallback(async () => {
    const requestId = ++lastLoadRequestIdRef.current;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (requestId !== lastLoadRequestIdRef.current) return;
    if (error) {
      toast.error("No se pudieron cargar los inmuebles");
      setProperties([]);
      setIsLoading(false);
      return;
    }

    setProperties(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleQueryCatastro = async (
    property: Property,
    options?: { silent?: boolean }
  ) => {
    if (!property.referencia_catastral) return;

    setQueryingId(property.id);

    try {
      const res = await fetch("/api/catastro/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          referencia_catastral: property.referencia_catastral,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          data?.error ??
            `Error (${res.status}) al consultar el Catastro`
        );
      }

      if (!options?.silent) {
        toast.success("Datos del Catastro obtenidos");
      }
      await loadProperties();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al consultar el Catastro"
      );
    } finally {
      setQueryingId(null);
    }
  };

  const handleQueryAll = async () => {
    const pending = properties.filter(
      (p) => !p.catastro_consultado && p.referencia_catastral
    );
    if (pending.length === 0) return;

    setQueryAllProgress({ current: 0, total: pending.length });

    for (let i = 0; i < pending.length; i++) {
      setQueryAllProgress({ current: i + 1, total: pending.length });
      await handleQueryCatastro(pending[i], { silent: true });
      if (i < pending.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CATASTRO_MS));
      }
    }

    await loadProperties();
    setQueryAllProgress(null);
    toast.success(
      pending.length === 1
        ? "Catastro consultado"
        : `Consultados ${pending.length} inmuebles en Catastro`
    );
  };

  const pendingCount = properties.filter(
    (p) => !p.catastro_consultado && p.referencia_catastral
  ).length;
  const alertCount = properties.filter((p) => p.alerta_fiscal).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Centro de Valoración Catastral
          </h2>
          <p className="text-muted-foreground">
            {properties.length} inmueble{properties.length !== 1 ? "s" : ""}{" "}
            extraído{properties.length !== 1 ? "s" : ""} de escrituras
            {alertCount > 0 && (
              <span className="ml-2 text-destructive">
                · {alertCount} alerta{alertCount !== 1 ? "s" : ""} fiscal
                {alertCount !== 1 ? "es" : ""}
              </span>
            )}
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={handleQueryAll}
            disabled={queryingId !== null || queryAllProgress !== null}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label={`Consultar Catastro de ${pendingCount} inmuebles`}
          >
            {queryAllProgress ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando {queryAllProgress.current}/{queryAllProgress.total}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Consultar Todos ({pendingCount})
              </>
            )}
          </button>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No hay inmuebles</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Los inmuebles aparecerán aquí cuando proceses escrituras de
            herencia.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className={`rounded-lg border bg-card p-4 space-y-3 ${
                prop.alerta_fiscal ? "border-destructive/50" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {prop.descripcion ?? "Inmueble"}
                  </p>
                  {prop.referencia_catastral && (
                    <p className="font-mono text-xs text-muted-foreground">
                      RC: {prop.referencia_catastral}
                    </p>
                  )}
                </div>
                {prop.catastro_consultado ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
              </div>

              {/* Values comparison */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded bg-muted p-2">
                  <p className="text-xs text-muted-foreground">
                    Valor Declarado
                  </p>
                  <p className="text-lg font-bold">
                    {prop.valor_declarado != null
                      ? `${prop.valor_declarado.toLocaleString("es-ES")} €`
                      : "—"}
                  </p>
                </div>
                <div
                  className={`rounded p-2 ${
                    prop.alerta_fiscal
                      ? "bg-destructive/10"
                      : prop.valor_referencia
                        ? "bg-success/10"
                        : "bg-muted"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">
                    Valor Referencia
                  </p>
                  <p className="text-lg font-bold">
                    {prop.valor_referencia != null
                      ? `${prop.valor_referencia.toLocaleString("es-ES")} €`
                      : !prop.catastro_consultado && prop.referencia_catastral
                        ? "Pendiente de consultar Catastro"
                        : prop.catastro_consultado
                          ? "No disponible en esta consulta de Catastro (habitual en rústicos)"
                          : "—"}
                  </p>
                </div>
              </div>

              {/* Fiscal alert */}
              {prop.alerta_fiscal && (
                <div className="flex items-center gap-2 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Contingencia fiscal detectada:</strong> Desviación
                    del {prop.desviacion_fiscal?.toFixed(1)}% respecto al valor
                    de referencia.
                  </span>
                </div>
              )}

              {/* Catastro details + link to Sede Catastro */}
              <PropertyCatastroCard property={prop} />

              {/* Query button */}
              {!prop.catastro_consultado && prop.referencia_catastral && (
                <button
                  onClick={() => handleQueryCatastro(prop)}
                  disabled={queryingId === prop.id}
                  className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {queryingId === prop.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                  Consultar Catastro
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValuationPage;
