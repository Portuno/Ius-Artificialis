"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/types/database";
import { FileText, Image, File, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

const DOC_TYPE_LABELS: Record<string, string> = {
  factura: "Factura",
  escritura_herencia: "Escritura",
  dni: "DNI",
  extracto_bancario: "Extracto",
  otro: "Otro",
};

const STATUS_CONFIG: Record<string, { icon: typeof Clock; className: string; label: string }> = {
  pending: { icon: Clock, className: "text-muted-foreground", label: "Pendiente" },
  processing: { icon: Loader2, className: "text-warning animate-spin", label: "Procesando" },
  extracted: { icon: CheckCircle2, className: "text-success", label: "Extraido" },
  validated: { icon: CheckCircle2, className: "text-primary", label: "Validado" },
  error: { icon: AlertCircle, className: "text-destructive", label: "Error" },
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (["jpg", "jpeg", "png", "tiff", "tif"].includes(fileType)) return Image;
  return FileText;
};

interface CuadranteDocumentalProps {
  documents: Document[];
}

const CuadranteDocumental = ({ documents }: CuadranteDocumentalProps) => {
  // Group documents by type
  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    const type = doc.doc_type || "sin_clasificar";
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Documental</h3>
        <span className="text-xs text-muted-foreground">
          {documents.length} archivo{documents.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sin documentos. Sube archivos desde la Carga Documental.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([type, docs]) => (
              <div key={type}>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  {DOC_TYPE_LABELS[type] ?? type} ({docs.length})
                </p>
                <div className="space-y-1">
                  {docs.map((doc) => {
                    const FileIcon = getFileIcon(doc.file_type);
                    const statusConfig = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <Link
                        key={doc.id}
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                        aria-label={`Ver documento ${doc.file_name}`}
                        tabIndex={0}
                      >
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{doc.file_name}</span>
                        <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${statusConfig.className}`} />
                        {doc.classification_confidence != null && (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                            {(doc.classification_confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CuadranteDocumental;
