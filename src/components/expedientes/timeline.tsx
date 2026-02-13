"use client";

import type { TimelineEvent } from "@/types/database";
import {
  FileUp,
  Skull,
  ScrollText,
  Receipt,
  Clock,
  Flag,
} from "lucide-react";

const TIPO_ICONS: Record<string, typeof Clock> = {
  documento_subido: FileUp,
  fecha_fallecimiento: Skull,
  fecha_escritura: ScrollText,
  fecha_factura: Receipt,
  vencimiento: Clock,
  hito_manual: Flag,
};

const TIPO_COLORS: Record<string, string> = {
  documento_subido: "bg-blue-500",
  fecha_fallecimiento: "bg-destructive",
  fecha_escritura: "bg-amber-500",
  fecha_factura: "bg-green-500",
  vencimiento: "bg-warning",
  hito_manual: "bg-primary",
};

interface TimelineProps {
  events: TimelineEvent[];
}

const Timeline = ({ events }: TimelineProps) => {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-4 py-6 text-center">
        <Clock className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Sin eventos en la linea de tiempo. Se generan automaticamente al procesar documentos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 font-semibold">Linea de Tiempo</h3>
      <div className="relative">
        {/* Horizontal line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />

        <div className="flex gap-0 overflow-x-auto pb-2">
          {events.map((event, index) => {
            const Icon = TIPO_ICONS[event.tipo_evento] ?? Flag;
            const color = TIPO_COLORS[event.tipo_evento] ?? "bg-muted";

            return (
              <div
                key={event.id}
                className="relative flex min-w-[140px] flex-shrink-0 flex-col items-center px-3"
              >
                {/* Dot */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${color} text-white`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium">
                    {new Date(event.fecha).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold leading-tight">
                    {event.titulo}
                  </p>
                  {event.descripcion && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                      {event.descripcion}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
