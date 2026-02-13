import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, ArrowLeft } from "lucide-react";
import type { Expediente } from "@/types/database";

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

interface ExpedienteDetailSkeletonProps {
  expediente: Expediente;
}

const ExpedienteDetailSkeleton = ({ expediente }: ExpedienteDetailSkeletonProps) => {
  const estadoStyle = ESTADO_STYLES[expediente.estado] ?? ESTADO_STYLES.abierto;

  return (
    <div className="space-y-6">
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
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" style={{ minHeight: "500px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="mb-3 h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded bg-muted" />
              <div className="h-12 animate-pulse rounded bg-muted" />
              <div className="h-12 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="flex gap-4">
          <div className="h-16 w-1 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpedienteDetailSkeleton;
