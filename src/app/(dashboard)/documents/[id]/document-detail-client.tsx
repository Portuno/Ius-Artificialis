"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import ConfidenceIndicator from "@/components/documents/confidence-indicator";
import PropertyCatastroCard from "@/components/catastro/property-catastro-card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Users,
  Building2,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import type {
  Document,
  Invoice,
  InvoiceLineItem,
  InheritanceDeed,
  Heir,
  Property,
} from "@/types/database";

type InvoiceDraft = {
  emisor: string;
  cif: string;
  numero_factura: string;
  fecha: string;
  base_imponible: string;
  total: string;
  concepto: string;
};

interface DocumentDetailClientProps {
  document: Document;
  invoices: Invoice[];
  deed: InheritanceDeed | null;
  heirs: Heir[];
  properties: Property[];
  fileUrl: string;
}

const invoiceToDraft = (inv: Invoice): InvoiceDraft => ({
  emisor: inv.emisor ?? "",
  cif: inv.cif ?? "",
  numero_factura: inv.numero_factura ?? "",
  fecha: inv.fecha ?? "",
  base_imponible:
    inv.base_imponible != null ? String(inv.base_imponible) : "",
  total: inv.total != null ? String(inv.total) : "",
  concepto: inv.concepto ?? "",
});

const normalizeInvoiceItems = (items: unknown): InvoiceLineItem[] => {
  if (!Array.isArray(items)) return [];

  return items.filter((item): item is InvoiceLineItem => {
    if (!item || typeof item !== "object") return false;
    const anyItem = item as any;
    return (
      anyItem.descripcion &&
      typeof anyItem.descripcion === "object" &&
      "value" in anyItem.descripcion &&
      "confidence" in anyItem.descripcion
    );
  });
};

const isFuelItemDescription = (text: string) =>
  /gasoil|gasóleo|gasoleo|diesel/i.test(text);

const formatMaybeCurrency = (value: number | null | undefined) => {
  if (value == null) return "—";
  return `${value.toLocaleString("es-ES")} €`;
};

const formatMaybeQuantity = (value: number | null | undefined) => {
  if (value == null) return "—";
  return value.toLocaleString("es-ES");
};

const DocumentDetailClient = ({
  document: doc,
  invoices,
  deed,
  heirs,
  properties,
  fileUrl,
}: DocumentDetailClientProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(() => {
    const first = invoices.findIndex((inv) => !inv.validated);
    return first >= 0 ? first : 0;
  });
  const [isQueryingCatastro, setIsQueryingCatastro] = useState<string | null>(
    null
  );
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<InvoiceDraft | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const selectedInvoice =
    invoices.length > 0 ? invoices[selectedInvoiceIndex] ?? invoices[0] : null;
  const selectedInvoiceItems = normalizeInvoiceItems(selectedInvoice?.items);
  const allInvoicesValidated =
    invoices.length > 0 &&
    invoices.every((inv) => inv.validated);
  const isValidated = doc.status === "validated";

  // Always use page_number if available, otherwise fallback to index + 1
  // page_number should always be set (either from Gemini or as fallback during extraction)
  const pdfPage =
    selectedInvoice?.page_number != null
      ? selectedInvoice.page_number
      : selectedInvoiceIndex + 1;
  const pdfSrc =
    doc.file_type === "pdf"
      ? `${fileUrl.split("#")[0]}#page=${pdfPage}`
      : fileUrl;

  useEffect(() => {
    setIsEditingInvoice(false);
    setDraftInvoice(null);
  }, [selectedInvoiceIndex, selectedInvoice?.id]);

  const saveDraftToInvoice = useCallback(async () => {
    if (!selectedInvoice || !draftInvoice) return;
    const base = parseFloat(draftInvoice.base_imponible.replace(",", "."));
    const total = parseFloat(draftInvoice.total.replace(",", "."));
    await supabase
      .from("invoices")
      .update({
        emisor: draftInvoice.emisor || null,
        cif: draftInvoice.cif || null,
        numero_factura: draftInvoice.numero_factura || null,
        fecha: draftInvoice.fecha || null,
        base_imponible: Number.isNaN(base) ? null : base,
        total: Number.isNaN(total) ? null : total,
        concepto: draftInvoice.concepto || null,
      })
      .eq("id", selectedInvoice.id);
  }, [selectedInvoice, draftInvoice, supabase]);

  const getNextUnvalidatedIndex = useCallback(
    (currentIndex: number) => {
      const next = invoices.findIndex(
        (inv, i) => i > currentIndex && !inv.validated
      );
      if (next >= 0) return next;
      return invoices.findIndex((inv) => !inv.validated);
    },
    [invoices]
  );

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
      if (isEditingInvoice && draftInvoice) {
        await saveDraftToInvoice();
        setIsEditingInvoice(false);
        setDraftInvoice(null);
      }

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

      const nextIdx = getNextUnvalidatedIndex(selectedInvoiceIndex);
      if (nextIdx >= 0 && nextIdx !== selectedInvoiceIndex) {
        setSelectedInvoiceIndex(nextIdx);
      }
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

  const showEditButton =
    !isValidated &&
    selectedInvoice &&
    !selectedInvoice.validated &&
    !deed;

  const handleStartEdit = () => {
    if (!selectedInvoice) return;
    setIsEditingInvoice(true);
    setDraftInvoice(invoiceToDraft(selectedInvoice));
  };

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
              key={pdfPage}
              src={pdfSrc}
              className="h-full w-full rounded"
              title={`Vista previa del documento - página ${pdfPage}`}
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
          <div className="flex items-center gap-2">
            {isEditingInvoice ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditingInvoice(false);
                  setDraftInvoice(null);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-muted/50 px-3 text-xs font-medium transition-colors hover:bg-muted"
                aria-label="Cancelar edición"
                tabIndex={0}
              >
                Cancelar
              </button>
            ) : (
              showEditButton && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  disabled={isValidating}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                  aria-label="Editar datos de la factura"
                  tabIndex={0}
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              )
            )}
            {showValidateButton && (
              <button
                type="button"
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
                Validar
              </button>
            )}
          </div>
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

              <InvoiceItemsSection items={selectedInvoiceItems} />

              {isEditingInvoice && draftInvoice ? (
                <div className="grid grid-cols-2 gap-3">
                  <FieldEdit
                    label="Emisor"
                    value={draftInvoice.emisor}
                    onChange={(v) =>
                      setDraftInvoice((prev) =>
                        prev ? { ...prev, emisor: v } : prev
                      )
                    }
                  />
                  <FieldEdit
                    label="CIF"
                    value={draftInvoice.cif}
                    onChange={(v) =>
                      setDraftInvoice((prev) =>
                        prev ? { ...prev, cif: v } : prev
                      )
                    }
                  />
                  <FieldEdit
                    label="N.º Factura"
                    value={draftInvoice.numero_factura}
                    onChange={(v) =>
                      setDraftInvoice((prev) =>
                        prev ? { ...prev, numero_factura: v } : prev
                      )
                    }
                  />
                  <FieldEdit
                    label="Fecha (YYYY-MM-DD)"
                    value={draftInvoice.fecha}
                    onChange={(v) =>
                      setDraftInvoice((prev) =>
                        prev ? { ...prev, fecha: v } : prev
                      )
                    }
                  />
                  <FieldEdit
                    label="Base Imponible"
                    value={draftInvoice.base_imponible}
                    onChange={(v) =>
                      setDraftInvoice((prev) =>
                        prev ? { ...prev, base_imponible: v } : prev
                      )
                    }
                  />
                  <FieldEdit
                    label="Total"
                    value={draftInvoice.total}
                    onChange={(v) =>
                      setDraftInvoice((prev) =>
                        prev ? { ...prev, total: v } : prev
                      )
                    }
                  />
                  <div className="col-span-2">
                    <FieldEdit
                      label="Concepto"
                      value={draftInvoice.concepto}
                      onChange={(v) =>
                        setDraftInvoice((prev) =>
                          prev ? { ...prev, concepto: v } : prev
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <>
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

                  {selectedInvoice.tipos_iva &&
                    selectedInvoice.tipos_iva.length > 0 && (
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
                                <span>
                                  {iva.importe.toLocaleString("es-ES")} €
                                </span>
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
                </>
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

                        <PropertyCatastroCard property={prop} compact />

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

const InvoiceItemsSection = ({ items }: { items: InvoiceLineItem[] }) => {
  const fuelItems = items.filter((item) =>
    isFuelItemDescription(item.descripcion.value ?? "")
  );
  const fuelLiters = fuelItems.reduce((sum, item) => {
    const unit = (item.unidad.value ?? "").toLowerCase();
    const isLiters = unit === "l" || unit.includes("lit");
    const qty = item.cantidad.value ?? 0;
    return sum + (isLiters ? qty : 0);
  }, 0);
  const fuelAmount = fuelItems.reduce(
    (sum, item) => sum + (item.importe.value ?? 0),
    0
  );

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Desglose de ítems
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          No se detectó un desglose de líneas en esta factura.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Desglose de ítems ({items.length})
          </p>
          <p className="text-[11px] text-muted-foreground">
            Prioritario para validación (p.ej. Gasoil A: litros e importe)
          </p>
        </div>
        {fuelItems.length > 0 && (
          <div className="shrink-0 rounded-md border border-amber-300/40 bg-amber-50/50 px-2 py-1 text-right text-xs dark:bg-amber-950/20">
            <p className="font-medium">Combustible detectado</p>
            <p className="text-muted-foreground">
              {fuelLiters > 0 ? `${fuelLiters.toLocaleString("es-ES")} L · ` : ""}
              {formatMaybeCurrency(fuelAmount)}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-7">Descripción</div>
          <div className="col-span-3 text-right">Cantidad</div>
          <div className="col-span-2 text-right">Importe</div>
        </div>
        <div className="divide-y">
          {items.map((item, idx) => {
            const desc = item.descripcion.value ?? "";
            const isFuel = isFuelItemDescription(desc);
            const rowConfidence = Math.min(
              item.descripcion.confidence,
              item.cantidad.confidence,
              item.unidad.confidence,
              item.precio_unitario.confidence,
              item.importe.confidence
            );

            const qty = formatMaybeQuantity(item.cantidad.value);
            const unit = item.unidad.value ?? "";
            const qtyWithUnit = unit ? `${qty} ${unit}` : qty;

            return (
              <div
                key={`${desc}-${idx}`}
                className={
                  isFuel ? "bg-amber-50/40 dark:bg-amber-950/10" : "bg-card"
                }
              >
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                  <div className="col-span-7 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{desc || "—"}</p>
                      <ConfidenceIndicator confidence={rowConfidence} />
                      {isFuel && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                          Fuel
                        </span>
                      )}
                    </div>
                    {(item.precio_unitario.value != null ||
                      item.precio_unitario.confidence > 0) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Precio unitario:{" "}
                        {formatMaybeCurrency(item.precio_unitario.value)}
                      </p>
                    )}
                  </div>
                  <div className="col-span-3 text-right font-medium">
                    {qtyWithUnit}
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    {formatMaybeCurrency(item.importe.value)}
                  </div>
                </div>
              </div>
            );
          })}
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

const FieldEdit = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">
      {label}
    </label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-sm"
      aria-label={label}
    />
  </div>
);

export default DocumentDetailClient;
