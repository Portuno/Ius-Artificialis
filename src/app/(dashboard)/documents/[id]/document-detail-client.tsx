"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import ConfidenceIndicator from "@/components/documents/confidence-indicator";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Users,
  Building2,
  AlertTriangle,
} from "lucide-react";
import type {
  Document,
  Invoice,
  InheritanceDeed,
  Heir,
  Property,
} from "@/types/database";

interface DocumentDetailClientProps {
  document: Document;
  invoices: Invoice[];
  deed: InheritanceDeed | null;
  heirs: Heir[];
  properties: Property[];
  fileUrl: string;
}

const DocumentDetailClient = ({
  document: doc,
  invoices,
  deed,
  heirs,
  properties,
  fileUrl,
}: DocumentDetailClientProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(0);
  const [isQueryingCatastro, setIsQueryingCatastro] = useState<string | null>(
    null
  );
  const router = useRouter();
  const supabase = createClient();

  const selectedInvoice =
    invoices.length > 0 ? invoices[selectedInvoiceIndex] ?? invoices[0] : null;
  const allInvoicesValidated =
    invoices.length > 0 &&
    invoices.every((inv) => inv.validated);
  const isValidated = doc.status === "validated";

  const handleValidate = async () => {
    if (deed) {
      setIsValidating(true);
      try {
        await supabase
          .from("documents")
          .update({ status: "validated", updated_at: new Date().toISOString() })
          .eq("id", doc.id);
        await supabase
          .from("inheritance_deeds")
          .update({
            validated: true,
            validated_at: new Date().toISOString(),
          })
          .eq("id", deed.id);
        toast.success("Documento validado correctamente");
        router.refresh();
      } catch {
        toast.error("Error al validar");
      } finally {
        setIsValidating(false);
      }
      return;
    }

    if (!selectedInvoice) return;
    setIsValidating(true);
    try {
      await supabase
        .from("invoices")
        .update({
          validated: true,
          validated_at: new Date().toISOString(),
        })
        .eq("id", selectedInvoice.id);

      const { data: remaining } = await supabase
        .from("invoices")
        .select("id")
        .eq("document_id", doc.id)
        .eq("validated", false);
      const allValidated = !remaining || remaining.length === 0;
      if (allValidated) {
        await supabase
          .from("documents")
          .update({
            status: "validated",
            updated_at: new Date().toISOString(),
          })
          .eq("id", doc.id);
      }

      toast.success(
        allValidated
          ? "Todas las facturas validadas"
          : "Factura validada correctamente"
      );
      router.refresh();
    } catch {
      toast.error("Error al validar");
    } finally {
      setIsValidating(false);
    }
  };

  const showValidateButton =
    !isValidated &&
    ((selectedInvoice && !selectedInvoice.validated) || (deed && !deed.validated));

  const handleQueryCatastro = async (property: Property) => {
    if (!property.referencia_catastral) return;

    setIsQueryingCatastro(property.id);

    try {
      const res = await fetch("/api/catastro/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          referencia_catastral: property.referencia_catastral,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al consultar");
      }

      toast.success("Datos del Catastro obtenidos");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al consultar el Catastro"
      );
    } finally {
      setIsQueryingCatastro(null);
    }
  };

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-2 gap-4">
      {/* Left panel: Document Preview */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Documento Original</h3>
          <p className="text-xs text-muted-foreground">{doc.file_name}</p>
        </div>
        <div className="h-full p-2">
          {doc.file_type === "pdf" ? (
            <iframe
              src={fileUrl}
              className="h-full w-full rounded"
              title="Vista previa del documento"
            />
          ) : (
            <img
              src={fileUrl}
              alt="Vista previa del documento"
              className="h-full w-full rounded object-contain"
            />
          )}
        </div>
      </div>

      {/* Right panel: Extracted Data */}
      <div className="overflow-y-auto rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-medium">Datos Extraídos</h3>
            <p className="text-xs text-muted-foreground">
              {isValidated || allInvoicesValidated
                ? "Validado"
                : "Pendiente de validación"}
            </p>
          </div>
          {showValidateButton && (
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-success px-3 text-xs font-medium text-success-foreground transition-colors hover:bg-success/90 disabled:opacity-50"
              aria-label="Validar y fijar datos"
              tabIndex={0}
            >
              {isValidating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Validar y Fijar Datos
            </button>
          )}
        </div>

        <div className="space-y-6 p-4">
          {/* Invoice selector when multiple */}
          {invoices.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Facturas en este documento ({invoices.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {invoices.map((inv, idx) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedInvoiceIndex(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedInvoiceIndex(idx);
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      selectedInvoiceIndex === idx
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/50 hover:bg-muted"
                    }`}
                    aria-label={`Factura ${idx + 1} de ${invoices.length}: ${inv.emisor ?? "S/N"} ${inv.total != null ? inv.total.toLocaleString("es-ES") + " €" : ""}`}
                    aria-pressed={selectedInvoiceIndex === idx}
                    tabIndex={0}
                  >
                    <span>Factura {idx + 1}</span>
                    {inv.emisor && (
                      <span className="max-w-[120px] truncate text-muted-foreground">
                        · {inv.emisor}
                      </span>
                    )}
                    {inv.total != null && (
                      <span className="text-muted-foreground">
                        {inv.total.toLocaleString("es-ES")} €
                      </span>
                    )}
                    {inv.validated && (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Data (single or selected) */}
          {invoices.length === 0 && doc.doc_type === "factura" && (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No se detectaron facturas en este documento.
              </p>
            </div>
          )}
          {selectedInvoice && (
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                Datos de Factura
                {invoices.length > 1 && (
                  <span className="text-muted-foreground font-normal">
                    ({selectedInvoiceIndex + 1} de {invoices.length})
                    {selectedInvoice.validated && " · Validada"}
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FieldDisplay
                  label="Emisor"
                  value={selectedInvoice.emisor}
                  confidence={selectedInvoice.confidence_scores?.emisor}
                />
                <FieldDisplay
                  label="CIF"
                  value={selectedInvoice.cif}
                  confidence={selectedInvoice.confidence_scores?.cif}
                />
                <FieldDisplay
                  label="N.º Factura"
                  value={selectedInvoice.numero_factura}
                  confidence={selectedInvoice.confidence_scores?.numero_factura}
                />
                <FieldDisplay
                  label="Fecha"
                  value={selectedInvoice.fecha}
                  confidence={selectedInvoice.confidence_scores?.fecha}
                />
                <FieldDisplay
                  label="Base Imponible"
                  value={
                    selectedInvoice.base_imponible != null
                      ? `${selectedInvoice.base_imponible.toLocaleString("es-ES")} €`
                      : null
                  }
                  confidence={selectedInvoice.confidence_scores?.base_imponible}
                />
                <FieldDisplay
                  label="Total"
                  value={
                    selectedInvoice.total != null
                      ? `${selectedInvoice.total.toLocaleString("es-ES")} €`
                      : null
                  }
                  confidence={selectedInvoice.confidence_scores?.total}
                />
              </div>

              {selectedInvoice.tipos_iva && selectedInvoice.tipos_iva.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Tipos de IVA
                  </p>
                  <div className="space-y-1">
                    {(selectedInvoice.tipos_iva as { porcentaje: number; importe: number }[]).map(
                      (iva, i) => (
                        <div
                          key={i}
                          className="flex justify-between rounded bg-muted px-2 py-1 text-xs"
                        >
                          <span>{iva.porcentaje}%</span>
                          <span>{iva.importe.toLocaleString("es-ES")} €</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {selectedInvoice.concepto && (
                <FieldDisplay
                  label="Concepto"
                  value={selectedInvoice.concepto}
                  confidence={selectedInvoice.confidence_scores?.concepto}
                />
              )}
            </div>
          )}

          {/* Deed Data */}
          {deed && (
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                Datos de Escritura de Herencia
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FieldDisplay
                  label="Causante"
                  value={deed.causante}
                  confidence={deed.confidence_scores?.causante}
                />
                <FieldDisplay
                  label="Fecha de Fallecimiento"
                  value={deed.fecha_fallecimiento}
                  confidence={deed.confidence_scores?.fecha_fallecimiento}
                />
                <FieldDisplay
                  label="Notario"
                  value={deed.notario}
                  confidence={deed.confidence_scores?.notario}
                />
                <FieldDisplay
                  label="Protocolo"
                  value={deed.protocolo}
                  confidence={deed.confidence_scores?.protocolo}
                />
              </div>

              {/* Heirs */}
              {heirs.length > 0 && (
                <div>
                  <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Herederos ({heirs.length})
                  </h5>
                  <div className="space-y-1">
                    {heirs.map((heir) => (
                      <div
                        key={heir.id}
                        className="flex items-center justify-between rounded bg-muted px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{heir.nombre}</span>
                          {heir.rol && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({heir.rol})
                            </span>
                          )}
                        </div>
                        {heir.porcentaje != null && (
                          <span className="text-xs font-medium">
                            {heir.porcentaje}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Properties */}
              {properties.length > 0 && (
                <div>
                  <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    Bienes Inmuebles ({properties.length})
                  </h5>
                  <div className="space-y-3">
                    {properties.map((prop) => (
                      <div
                        key={prop.id}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <p className="text-sm font-medium">
                          {prop.descripcion ?? "Inmueble sin descripción"}
                        </p>

                        {prop.referencia_catastral && (
                          <p className="font-mono text-xs text-muted-foreground">
                            RC: {prop.referencia_catastral}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs">
                          {prop.valor_declarado != null && (
                            <span>
                              Valor declarado:{" "}
                              <strong>
                                {prop.valor_declarado.toLocaleString("es-ES")} €
                              </strong>
                            </span>
                          )}
                          <span>
                            Valor referencia:{" "}
                            <strong>
                              {prop.valor_referencia != null
                                ? `${prop.valor_referencia.toLocaleString("es-ES")} €`
                                : "—"}
                            </strong>
                          </span>
                        </div>

                        {prop.alerta_fiscal && (
                          <div className="flex items-center gap-1.5 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Alerta fiscal: Desviación del{" "}
                            {prop.desviacion_fiscal?.toFixed(1)}%
                          </div>
                        )}

                        {prop.catastro_consultado && prop.catastro_direccion && (
                          <div className="rounded bg-muted px-2 py-1.5 text-xs space-y-0.5">
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {prop.catastro_direccion}
                            </p>
                            {prop.catastro_superficie && (
                              <p>Superficie: {prop.catastro_superficie} m²</p>
                            )}
                            {prop.catastro_uso && <p>Uso: {prop.catastro_uso}</p>}
                          </div>
                        )}

                        {!prop.catastro_consultado &&
                          prop.referencia_catastral && (
                            <button
                              onClick={() => handleQueryCatastro(prop)}
                              disabled={isQueryingCatastro === prop.id}
                              className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                              {isQueryingCatastro === prop.id ? (
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
                </div>
              )}
            </div>
          )}

          {/* No extracted data (other types or no data) */}
          {!deed &&
            !selectedInvoice &&
            (doc.doc_type !== "factura" || invoices.length > 0) && (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No se han extraído datos para este tipo de documento.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

// Field display component with confidence indicator
const FieldDisplay = ({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string | null | undefined;
  confidence?: number;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {confidence != null && (
        <ConfidenceIndicator confidence={confidence} />
      )}
    </div>
    <p className="rounded bg-muted px-2 py-1.5 text-sm">
      {value ?? <span className="text-muted-foreground">—</span>}
    </p>
  </div>
);

export default DocumentDetailClient;
