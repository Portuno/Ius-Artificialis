"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import CuadranteDocumental from "@/components/expedientes/cuadrante-documental";
import CuadranteSujetos from "@/components/expedientes/cuadrante-sujetos";
import CuadrantePatrimonial from "@/components/expedientes/cuadrante-patrimonial";
import CuadranteFinanciero from "@/components/expedientes/cuadrante-financiero";
import Timeline from "@/components/expedientes/timeline";
import type {
  Expediente,
  Document,
  Sujeto,
  TimelineEvent,
  Invoice,
  Property,
  ExpedienteEstado,
} from "@/types/database";
import {
  FolderOpen,
  Upload,
  Settings,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const ESTADO_STYLES: Record<string, { label: string; className: string }> = {
  abierto: { label: "Abierto", className: "bg-success/10 text-success border-success/30" },
  en_proceso: { label: "En Proceso", className: "bg-warning/10 text-warning border-warning/30" },
  cerrado: { label: "Cerrado", className: "bg-muted text-muted-foreground" },
  archivado: { label: "Archivado", className: "bg-muted text-muted-foreground" },
};

const TIPO_CAUSA_LABELS: Record<string, string> = {
  herencia: "Herencia",
  facturacion: "Facturacion",
  litigio_civil: "Litigio Civil",
  otro: "Otro",
};

interface ExpedienteDetailClientProps {
  expediente: Expediente;
  initialDocuments: Document[];
  initialSujetos: Sujeto[];
  initialTimeline: TimelineEvent[];
  initialInvoices: unknown[];
  initialProperties: unknown[];
}

const ExpedienteDetailClient = ({
  expediente,
  initialDocuments,
  initialSujetos,
  initialTimeline,
  initialInvoices,
  initialProperties,
}: ExpedienteDetailClientProps) => {
  const router = useRouter();
  const [documents] = useState<Document[]>(initialDocuments);
  const [sujetos, setSujetos] = useState<Sujeto[]>(initialSujetos);
  const [timeline] = useState<TimelineEvent[]>(initialTimeline);
  const [isDeleting, setIsDeleting] = useState(false);

  const estadoStyle = ESTADO_STYLES[expediente.estado] ?? ESTADO_STYLES.abierto;

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleSujetoDeleted = useCallback((id: string) => {
    setSujetos((prev) => prev.filter((s) => s.id !== id));
    toast.success("Sujeto eliminado");
  }, []);

  const handleEstadoChange = async (newEstado: ExpedienteEstado) => {
    try {
      const res = await fetch(`/api/expedientes/${expediente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newEstado }),
      });

      if (!res.ok) {
        throw new Error("Error al actualizar estado");
      }

      toast.success(`Estado actualizado a: ${ESTADO_STYLES[newEstado]?.label ?? newEstado}`);
      router.refresh();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres eliminar este expediente? Se eliminaran todos los sujetos y eventos asociados.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expedientes/${expediente.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Error al eliminar");
      }

      toast.success("Expediente eliminado");
      router.push("/expedientes");
    } catch {
      toast.error("Error al eliminar expediente");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/expedientes"
            className="mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Volver a expedientes"
            tabIndex={0}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">
                {expediente.titulo}
              </h2>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{expediente.numero_expediente}</span>
              {expediente.cliente && (
                <>
                  <span>·</span>
                  <span>{expediente.cliente}</span>
                </>
              )}
              <Badge className={estadoStyle.className} variant="outline">
                {estadoStyle.label}
              </Badge>
              <Badge variant="secondary">
                {TIPO_CAUSA_LABELS[expediente.tipo_causa] ?? expediente.tipo_causa}
              </Badge>
            </div>
            {expediente.descripcion && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {expediente.descripcion}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/upload?expediente=${expediente.id}`}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label="Subir documentos al expediente"
            tabIndex={0}
          >
            <Upload className="h-4 w-4" />
            Subir Documentos
          </Link>

          {/* Estado dropdown */}
          <div className="relative">
            <select
              value={expediente.estado}
              onChange={(e) => handleEstadoChange(e.target.value as ExpedienteEstado)}
              className="h-9 cursor-pointer appearance-none rounded-md border bg-card px-3 pr-8 text-sm font-medium transition-colors hover:bg-muted"
              aria-label="Cambiar estado del expediente"
            >
              <option value="abierto">Abierto</option>
              <option value="en_proceso">En Proceso</option>
              <option value="cerrado">Cerrado</option>
              <option value="archivado">Archivado</option>
            </select>
            <Settings className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            aria-label="Eliminar expediente"
            tabIndex={0}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 360 View - 4 Quadrants */}
      <div className="grid gap-4 lg:grid-cols-2" style={{ minHeight: "500px" }}>
        <CuadranteDocumental documents={documents} />
        <CuadranteSujetos
          sujetos={sujetos}
          expedienteId={expediente.id}
          onSujetoCreated={handleRefresh}
          onSujetoDeleted={handleSujetoDeleted}
        />
        <CuadrantePatrimonial properties={initialProperties as Property[]} />
        <CuadranteFinanciero invoices={initialInvoices as Invoice[]} />
      </div>

      {/* Timeline */}
      <Timeline events={timeline} />
    </div>
  );
};

export default ExpedienteDetailClient;
