"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import type { Expediente } from "@/types/database";

type FileStatus = "pending" | "uploading" | "processing" | "done" | "error";

interface UploadedFile {
  file: File;
  status: FileStatus;
  documentId?: string;
  docType?: string;
  confidence?: number;
  error?: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tiff", ".tif"],
};

const DOC_TYPE_LABELS: Record<string, string> = {
  factura: "Factura",
  escritura_herencia: "Escritura de Herencia",
  dni: "DNI / Documento de Identidad",
  extracto_bancario: "Extracto Bancario",
  otro: "Otro",
};

const UploadPage = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [selectedExpediente, setSelectedExpediente] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load expedientes for the dropdown
  useEffect(() => {
    const loadExpedientes = async () => {
      try {
        const res = await fetch("/api/expedientes");
        const data = await res.json();
        if (data.expedientes) {
          setExpedientes(data.expedientes);
        }
      } catch {
        // Silently fail — dropdown will just be empty
      }
    };
    loadExpedientes();
  }, []);

  // Pre-select expediente from URL param
  useEffect(() => {
    const expParam = searchParams.get("expediente");
    if (expParam) {
      setSelectedExpediente(expParam);
    }
  }, [searchParams]);

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: "pending" as FileStatus,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const handleUploadAndProcess = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const uploadedFile = files[i];
      if (uploadedFile.status !== "pending") continue;

      // Step 1: Upload
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        const formData = new FormData();
        formData.append("files", uploadedFile.file);
        if (selectedExpediente) {
          formData.append("expediente_id", selectedExpediente);
        }

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.results?.[0]?.success) {
          throw new Error(
            uploadData.results?.[0]?.error ?? "Error al subir archivo"
          );
        }

        const documentId = uploadData.results[0].document_id;

        // Step 2: Process with Gemini
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "processing", documentId } : f
          )
        );

        const processRes = await fetch("/api/documents/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: documentId }),
        });

        const processData = await processRes.json();

        if (!processRes.ok) {
          throw new Error(processData.error ?? "Error al procesar");
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "done",
                  docType: processData.type,
                  confidence: processData.classification?.confidence,
                }
              : f
          )
        );

        toast.success(`${uploadedFile.file.name} procesado`, {
          description: `Clasificado como: ${DOC_TYPE_LABELS[processData.type] ?? processData.type}`,
        });
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error
                      ? error.message
                      : "Error desconocido",
                }
              : f
          )
        );
        toast.error(`Error con ${uploadedFile.file.name}`);
      }
    }

    setIsProcessing(false);
  };

  const handleClear = () => {
    setFiles([]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Centro de Carga Documental
        </h2>
        <p className="text-muted-foreground">
          Arrastra y suelta tus documentos. El sistema los clasificará y
          extraerá los datos automáticamente.
        </p>
      </div>

      {/* Expediente Selector */}
      <div className="rounded-lg border bg-card p-4">
        <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="h-4 w-4 text-primary" />
          Vincular a Expediente
        </Label>
        <Select
          value={selectedExpediente}
          onValueChange={setSelectedExpediente}
        >
          <SelectTrigger aria-label="Seleccionar expediente">
            <SelectValue placeholder="Sin expediente (documento suelto)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin expediente</SelectItem>
            {expedientes.map((exp) => (
              <SelectItem key={exp.id} value={exp.id}>
                {exp.numero_expediente} — {exp.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Los documentos subidos se asociaran al expediente seleccionado.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de documentos. Haz clic o arrastra archivos aquí."
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            "mb-4 h-12 w-12",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        {isDragActive ? (
          <p className="text-lg font-medium text-primary">
            Suelta los archivos aquí...
          </p>
        ) : (
          <>
            <p className="text-lg font-medium">
              Arrastra documentos o haz clic para seleccionar
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Formatos aceptados: PDF, JPG, PNG, TIFF
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} archivo{files.length !== 1 ? "s" : ""} ·{" "}
              {doneCount} procesado{doneCount !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Limpiar
              </button>
              <button
                onClick={handleUploadAndProcess}
                disabled={isProcessing || pendingCount === 0}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isProcessing
                  ? "Procesando..."
                  : `Procesar ${pendingCount} archivo${pendingCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((f, idx) => (
              <div
                key={`${f.file.name}-${idx}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {f.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(f.file.size / 1024).toFixed(1)} KB
                    {f.docType
                      ? ` · ${DOC_TYPE_LABELS[f.docType] ?? f.docType}`
                      : ""}
                    {f.confidence
                      ? ` · ${(f.confidence * 100).toFixed(0)}% confianza`
                      : ""}
                  </p>
                </div>

                {/* Status */}
                <div className="flex shrink-0 items-center gap-2">
                  {f.status === "pending" && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Pendiente
                    </span>
                  )}
                  {f.status === "uploading" && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Subiendo
                    </span>
                  )}
                  {f.status === "processing" && (
                    <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analizando
                    </span>
                  )}
                  {f.status === "done" && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  {f.status === "error" && (
                    <div
                      className="flex items-center gap-1"
                      title={f.error}
                    >
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}

                  {f.status === "pending" && (
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label={`Eliminar ${f.file.name}`}
                      tabIndex={0}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {doneCount > 0 && !isProcessing && (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3">
              <AlertCircle className="h-4 w-4 text-success" />
              <p className="text-sm text-success">
                {doneCount} documento{doneCount !== 1 ? "s" : ""} procesado
                {doneCount !== 1 ? "s" : ""} correctamente.{" "}
                <button
                  onClick={() => router.push("/documents")}
                  className="font-medium underline underline-offset-2"
                >
                  Ver documentos
                </button>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadPage;
