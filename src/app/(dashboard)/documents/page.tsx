import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  FileText,
  Receipt,
  ScrollText,
  CreditCard,
  HelpCircle,
  IdCard,
} from "lucide-react";
import type { DocumentStatus, DocumentType } from "@/types/database";

const DOC_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof FileText; color: string }
> = {
  factura: { label: "Factura", icon: Receipt, color: "text-blue-600" },
  escritura_herencia: {
    label: "Escritura de Herencia",
    icon: ScrollText,
    color: "text-amber-600",
  },
  dni: { label: "DNI", icon: IdCard, color: "text-green-600" },
  extracto_bancario: {
    label: "Extracto Bancario",
    icon: CreditCard,
    color: "text-purple-600",
  },
  otro: { label: "Otro", icon: HelpCircle, color: "text-gray-600" },
};

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-muted text-muted-foreground",
  },
  processing: {
    label: "Procesando",
    className: "bg-warning/10 text-warning",
  },
  extracted: {
    label: "Extraído",
    className: "bg-primary/10 text-primary",
  },
  validated: {
    label: "Validado",
    className: "bg-success/10 text-success",
  },
  error: {
    label: "Error",
    className: "bg-destructive/10 text-destructive",
  },
};

const DocumentsPage = async () => {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documentos</h2>
          <p className="text-muted-foreground">
            {documents?.length ?? 0} documento
            {(documents?.length ?? 0) !== 1 ? "s" : ""} procesado
            {(documents?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Cargar Documentos
        </Link>
      </div>

      {!documents || documents.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No hay documentos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube tu primer documento para comenzar el análisis.
          </p>
          <Link
            href="/upload"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Cargar Documentos
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1fr_150px_120px_120px_100px] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
            <div>Nombre</div>
            <div>Tipo</div>
            <div>Estado</div>
            <div>Confianza</div>
            <div>Fecha</div>
          </div>

          {documents.map((doc) => {
            const typeConfig =
              DOC_TYPE_CONFIG[doc.doc_type as DocumentType] ??
              DOC_TYPE_CONFIG.otro;
            const statusConfig =
              STATUS_CONFIG[doc.status as DocumentStatus] ??
              STATUS_CONFIG.pending;
            const Icon = typeConfig.icon;

            return (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="grid grid-cols-[1fr_150px_120px_120px_100px] gap-4 border-b px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${typeConfig.color}`} />
                  <span className="truncate font-medium">{doc.file_name}</span>
                </div>
                <div className={typeConfig.color}>{typeConfig.label}</div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <div>
                  {doc.classification_confidence != null
                    ? `${(doc.classification_confidence * 100).toFixed(0)}%`
                    : "—"}
                </div>
                <div className="text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
