"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfidenceIndicator from "@/components/documents/confidence-indicator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";
import type { Document, Invoice, InheritanceDeed } from "@/types/database";

interface ValidationItem {
  document: Document;
  invoice?: Invoice;
  deed?: InheritanceDeed;
  minConfidence: number;
  invoiceIndex?: number;
  invoiceTotal?: number;
}

const ValidationPage = () => {
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const router = useRouter();

  const loadItems = useCallback(async () => {
    const supabase = createClient();
    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "extracted")
      .order("created_at", { ascending: false });

    if (!documents) {
      setIsLoading(false);
      return;
    }

    const validationItems: ValidationItem[] = [];

    for (const doc of documents) {
      const supabaseInner = createClient();

      if (doc.doc_type === "factura") {
        const { data: invoicesData } = await supabaseInner
          .from("invoices")
          .select("*")
          .eq("document_id", doc.id)
          .order("created_at", { ascending: true });

        const invoices = (invoicesData ?? []) as Invoice[];
        const unvalidated = invoices.filter((inv) => !inv.validated);
        for (const inv of unvalidated) {
          const scores = Object.values(
            (inv.confidence_scores as Record<string, number>) ?? {}
          );
          const minConfidence =
            scores.length > 0 ? Math.min(...scores) : 1;
          validationItems.push({
            document: doc as Document,
            invoice: inv,
            minConfidence,
            invoiceIndex:
              invoices.findIndex((i) => i.id === inv.id) + 1,
            invoiceTotal: invoices.length,
          });
        }
      }

      if (doc.doc_type === "escritura_herencia") {
        const { data } = await supabaseInner
          .from("inheritance_deeds")
          .select("*")
          .eq("document_id", doc.id)
          .single();

        if (data) {
          const deed = data as InheritanceDeed;
          const scores = Object.values(
            (data.confidence_scores as Record<string, number>) ?? {}
          );
          const minConfidence =
            scores.length > 0 ? Math.min(...scores) : 1;
          validationItems.push({
            document: doc as Document,
            deed,
            minConfidence,
          });
        }
      }
    }

    validationItems.sort((a, b) => a.minConfidence - b.minConfidence);
    setItems(validationItems);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const getItemId = (item: ValidationItem) =>
    item.invoice ? item.invoice.id : item.document.id;

  const handleValidate = async (item: ValidationItem) => {
    const idToShow = getItemId(item);
    setValidatingId(idToShow);
    const supabase = createClient();

    try {
      if (item.invoice) {
        await supabase
          .from("invoices")
          .update({
            validated: true,
            validated_at: new Date().toISOString(),
          })
          .eq("id", item.invoice.id);

        const { data: remaining } = await supabase
          .from("invoices")
          .select("id")
          .eq("document_id", item.document.id)
          .eq("validated", false);
        if (!remaining || remaining.length === 0) {
          await supabase
            .from("documents")
            .update({
              status: "validated",
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.document.id);
        }
        toast.success(
          remaining && remaining.length > 0
            ? "Factura validada"
            : "Documento validado"
        );
        setItems((prev) =>
          prev.filter((i) => (i.invoice ? i.invoice.id : i.document.id) !== idToShow)
        );
      } else if (item.deed) {
        await supabase
          .from("documents")
          .update({
            status: "validated",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.document.id);
        await supabase
          .from("inheritance_deeds")
          .update({
            validated: true,
            validated_at: new Date().toISOString(),
          })
          .eq("id", item.deed.id);
        toast.success("Documento validado");
        setItems((prev) =>
          prev.filter((i) => i.document.id !== item.document.id)
        );
      }
    } catch {
      toast.error("Error al validar");
    } finally {
      setValidatingId(null);
    }
  };

  const handleReject = async (documentId: string) => {
    setValidatingId(documentId);
    const supabase = createClient();

    try {
      await supabase
        .from("documents")
        .update({
          status: "error",
          error_message: "Rechazado en validación",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      toast.info("Documento rechazado");
      setItems((prev) => prev.filter((i) => i.document.id !== documentId));
    } catch {
      toast.error("Error al rechazar");
    } finally {
      setValidatingId(null);
    }
  };

  const lowConfidenceCount = items.filter(
    (i) => i.minConfidence < 0.8
  ).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Cola de Validación (HITL)
        </h2>
        <p className="text-muted-foreground">
          {items.length} ítem{items.length !== 1 ? "s" : ""} pendiente
          {items.length !== 1 ? "s" : ""} de validación
          {lowConfidenceCount > 0 && (
            <span className="ml-1 text-warning">
              · {lowConfidenceCount} con baja confianza
            </span>
          )}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-success" />
          <h3 className="text-lg font-medium">Todo validado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay documentos pendientes de revisión.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const itemId = getItemId(item);
            const isLowConfidence = item.minConfidence < 0.8;
            const docTypeLabel =
              item.document.doc_type === "factura"
                ? "Factura"
                : item.document.doc_type === "escritura_herencia"
                  ? "Escritura"
                  : item.document.doc_type ?? "Otro";
            const subtitle =
              item.invoice && item.invoiceTotal && item.invoiceTotal > 1
                ? `Factura ${item.invoiceIndex}/${item.invoiceTotal} · ${item.invoice.emisor ?? "S/N"}${item.invoice.total != null ? ` · ${item.invoice.total.toLocaleString("es-ES")} €` : ""}`
                : null;

            return (
              <div
                key={itemId}
                className={`flex items-center gap-4 rounded-lg border bg-card p-4 ${
                  isLowConfidence ? "border-warning/50" : ""
                }`}
              >
                <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {item.document.file_name}
                    </p>
                    {isLowConfidence && (
                      <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                    )}
                  </div>
                  {subtitle && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  )}
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                      {docTypeLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      Confianza mín:{" "}
                      <ConfidenceIndicator
                        confidence={item.minConfidence}
                        showLabel
                      />
                    </span>
                    <span>
                      {new Date(item.document.created_at).toLocaleDateString(
                        "es-ES"
                      )}
                    </span>
                  </div>

                  {item.invoice && (!subtitle || item.invoiceTotal === 1) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.invoice.emisor && `${item.invoice.emisor} · `}
                      {item.invoice.total != null &&
                        `${item.invoice.total.toLocaleString("es-ES")} €`}
                    </p>
                  )}
                  {item.deed && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.deed.causante &&
                        `Causante: ${item.deed.causante}`}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() =>
                      router.push(`/documents/${item.document.id}`)
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-muted"
                    aria-label="Ver detalle"
                    tabIndex={0}
                  >
                    <Eye className="h-3 w-3" />
                    Ver
                  </button>
                  <button
                    onClick={() => handleReject(item.document.id)}
                    disabled={validatingId === item.document.id}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-destructive/30 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    aria-label="Rechazar documento"
                    tabIndex={0}
                  >
                    <XCircle className="h-3 w-3" />
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleValidate(item)}
                    disabled={validatingId === itemId}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-2.5 text-xs font-medium text-success-foreground transition-colors hover:bg-success/90 disabled:opacity-50"
                    aria-label={
                      item.invoice
                        ? "Validar factura"
                        : "Validar documento"
                    }
                    tabIndex={0}
                  >
                    {validatingId === itemId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    Validar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ValidationPage;
