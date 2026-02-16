"use client";

import { Badge } from "@/components/ui/badge";
import type { Property } from "@/types/database";
import { MapPin, AlertTriangle, Home, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getCatastroPropertyUrl } from "@/lib/catastro/client";

interface CuadrantePatrimonialProps {
  properties: Property[];
}

const formatCurrency = (value: number | null) => {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

const CuadrantePatrimonial = ({ properties }: CuadrantePatrimonialProps) => {
  const totalValorDeclarado = properties.reduce(
    (sum, p) => sum + (p.valor_declarado ?? 0),
    0
  );
  const totalValorReferencia = properties.reduce(
    (sum, p) => sum + (p.valor_referencia ?? 0),
    0
  );
  const alertas = properties.filter((p) => p.alerta_fiscal);

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Patrimonial</h3>
        <div className="flex items-center gap-2">
          {alertas.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {alertas.length} alerta{alertas.length !== 1 ? "s" : ""}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {properties.length} inmueble{properties.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Home className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sin inmuebles registrados. Se extraen de escrituras de herencia.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {properties.map((property) => (
              <div
                key={property.id}
                className={`rounded-lg border p-3 ${
                  property.alerta_fiscal
                    ? "border-destructive/30 bg-destructive/5"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {property.descripcion || "Inmueble sin descripcion"}
                    </p>
                    {property.referencia_catastral && (
                      <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        Ref: {property.referencia_catastral}
                        <button
                          type="button"
                          onClick={async () => {
                            const url = getCatastroPropertyUrl(
                              property.referencia_catastral!
                            );
                            try {
                              await navigator.clipboard.writeText(
                                property.referencia_catastral
                              );
                            } catch {
                              /* ignore */
                            }
                            window.open(url, "_blank", "noopener,noreferrer");
                            toast.info(
                              "Referencia copiada. Pega (Ctrl+V) en el campo de la Sede del Catastro."
                            );
                          }}
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                          aria-label={`Abrir Catastro y copiar ref: ${property.referencia_catastral}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Catastro
                        </button>
                      </p>
                    )}
                  </div>
                  {property.alerta_fiscal && (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">V. Declarado</p>
                    <p className="font-medium">{formatCurrency(property.valor_declarado)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">V. Referencia</p>
                    <p className="font-medium">{formatCurrency(property.valor_referencia)}</p>
                  </div>
                </div>

                {property.desviacion_fiscal != null && (
                  <div className="mt-1.5">
                    <Badge
                      variant="outline"
                      className={
                        property.desviacion_fiscal < 0
                          ? "bg-destructive/10 text-destructive border-destructive/30 text-[10px]"
                          : "bg-success/10 text-success border-success/30 text-[10px]"
                      }
                    >
                      Desviacion: {property.desviacion_fiscal > 0 ? "+" : ""}
                      {property.desviacion_fiscal.toFixed(1)}%
                    </Badge>
                  </div>
                )}

                {property.catastro_direccion && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {property.catastro_direccion}
                    {property.catastro_municipio ? `, ${property.catastro_municipio}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {properties.length > 0 && (
        <div className="border-t px-4 py-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Total Declarado</p>
              <p className="font-semibold">{formatCurrency(totalValorDeclarado)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Referencia</p>
              <p className="font-semibold">{formatCurrency(totalValorReferencia)}</p>
            </div>
          </div>
          <Link
            href="/valuation"
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            Ir a Valoracion Catastral
          </Link>
        </div>
      )}
    </div>
  );
};

export default CuadrantePatrimonial;
