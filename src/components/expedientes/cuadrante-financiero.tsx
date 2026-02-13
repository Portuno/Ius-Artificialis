"use client";

import type { Invoice } from "@/types/database";
import { Receipt, TrendingUp } from "lucide-react";

interface CuadranteFinancieroProps {
  invoices: Invoice[];
}

const formatCurrency = (value: number | null) => {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

const CuadranteFinanciero = ({ invoices }: CuadranteFinancieroProps) => {
  const totalBase = invoices.reduce(
    (sum, inv) => sum + (inv.base_imponible ?? 0),
    0
  );
  const totalIva = invoices.reduce((sum, inv) => {
    const ivaTotal = (inv.tipos_iva ?? []).reduce(
      (s, entry) => s + (entry.importe ?? 0),
      0
    );
    return sum + ivaTotal;
  }, 0);
  const totalFacturado = invoices.reduce(
    (sum, inv) => sum + (inv.total ?? 0),
    0
  );
  const validatedCount = invoices.filter((inv) => inv.validated).length;

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Financiero</h3>
        <span className="text-xs text-muted-foreground">
          {invoices.length} factura{invoices.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sin facturas registradas. Se extraen al procesar documentos.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Base Imponible</p>
                <p className="mt-1 text-lg font-bold">{formatCurrency(totalBase)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">IVA Total</p>
                <p className="mt-1 text-lg font-bold">{formatCurrency(totalIva)}</p>
              </div>
            </div>

            <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Total Facturado</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-primary">
                {formatCurrency(totalFacturado)}
              </p>
            </div>

            {/* Invoice List */}
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Detalle de Facturas
              </p>
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {inv.emisor || "Sin emisor"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.numero_factura ?? "S/N"} ·{" "}
                      {inv.fecha
                        ? new Date(inv.fecha).toLocaleDateString("es-ES")
                        : "Sin fecha"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(inv.total)}</p>
                    {inv.validated && (
                      <p className="text-[10px] text-success">Validada</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {invoices.length > 0 && (
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          {validatedCount}/{invoices.length} factura{invoices.length !== 1 ? "s" : ""} validada{validatedCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

export default CuadranteFinanciero;
