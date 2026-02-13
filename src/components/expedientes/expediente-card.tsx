"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Expediente } from "@/types/database";
import {
  FolderOpen,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";

const ESTADO_STYLES: Record<string, { label: string; className: string }> = {
  abierto: { label: "Abierto", className: "bg-success/10 text-success border-success/30" },
  en_proceso: { label: "En Proceso", className: "bg-warning/10 text-warning border-warning/30" },
  cerrado: { label: "Cerrado", className: "bg-muted text-muted-foreground" },
  archivado: { label: "Archivado", className: "bg-muted text-muted-foreground" },
};

const TIPO_CAUSA_LABELS: Record<string, string> = {
  herencia: "Herencia",
  facturacion: "Facturación",
  litigio_civil: "Litigio Civil",
  otro: "Otro",
};

interface ExpedienteCardProps {
  expediente: Expediente;
}

const ExpedienteCard = ({ expediente }: ExpedienteCardProps) => {
  const estadoStyle = ESTADO_STYLES[expediente.estado] ?? ESTADO_STYLES.abierto;

  return (
    <Link
      href={`/expedientes/${expediente.id}`}
      className="group flex flex-col rounded-xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label={`Abrir expediente ${expediente.titulo}`}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{expediente.titulo}</h3>
            <p className="text-xs text-muted-foreground">
              {expediente.numero_expediente}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>

      {expediente.descripcion && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {expediente.descripcion}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge className={estadoStyle.className} variant="outline">
          {estadoStyle.label}
        </Badge>
        <Badge variant="secondary">
          {TIPO_CAUSA_LABELS[expediente.tipo_causa] ?? expediente.tipo_causa}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        {expediente.cliente && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {expediente.cliente}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(expediente.created_at).toLocaleDateString("es-ES")}
        </span>
      </div>
    </Link>
  );
};

export default ExpedienteCard;
