"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Sujeto } from "@/types/database";
import { User, Building2, Plus, Trash2, Mail, Phone } from "lucide-react";
import SujetoForm from "./sujeto-form";

const ROL_LABELS: Record<string, string> = {
  causante: "Causante",
  heredero: "Heredero",
  acreedor: "Acreedor",
  deudor: "Deudor",
  notario: "Notario",
  testigo: "Testigo",
  emisor: "Emisor",
  otro: "Otro",
};

const ROL_COLORS: Record<string, string> = {
  causante: "bg-destructive/10 text-destructive border-destructive/30",
  heredero: "bg-primary/10 text-primary border-primary/30",
  acreedor: "bg-warning/10 text-warning border-warning/30",
  deudor: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  notario: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  emisor: "bg-green-500/10 text-green-600 border-green-500/30",
  testigo: "bg-muted text-muted-foreground",
  otro: "bg-muted text-muted-foreground",
};

interface CuadranteSujetosProps {
  sujetos: Sujeto[];
  expedienteId: string;
  onSujetoCreated: () => void;
  onSujetoDeleted: (id: string) => void;
}

const CuadranteSujetos = ({
  sujetos,
  expedienteId,
  onSujetoCreated,
  onSujetoDeleted,
}: CuadranteSujetosProps) => {
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (sujetoId: string) => {
    setDeletingId(sujetoId);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/sujetos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sujeto_id: sujetoId }),
      });

      if (res.ok) {
        onSujetoDeleted(sujetoId);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Sujetos</h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          aria-label="Agregar sujeto"
          tabIndex={0}
        >
          <Plus className="h-3 w-3" />
          Agregar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sujetos.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <User className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sin sujetos registrados. Se generan automaticamente al procesar documentos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sujetos.map((sujeto) => (
              <div
                key={sujeto.id}
                className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {sujeto.tipo_persona === "juridica" ? (
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{sujeto.nombre_completo}</p>
                      {sujeto.dni_cif && (
                        <p className="text-xs text-muted-foreground">{sujeto.dni_cif}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(sujeto.id)}
                    disabled={deletingId === sujeto.id}
                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    aria-label={`Eliminar sujeto ${sujeto.nombre_completo}`}
                    tabIndex={0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={ROL_COLORS[sujeto.rol_procesal] ?? ROL_COLORS.otro}
                  >
                    {ROL_LABELS[sujeto.rol_procesal] ?? sujeto.rol_procesal}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {sujeto.tipo_persona === "juridica" ? "Juridica" : "Fisica"}
                  </Badge>
                </div>

                {(sujeto.contacto_email || sujeto.contacto_telefono) && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {sujeto.contacto_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {sujeto.contacto_email}
                      </span>
                    )}
                    {sujeto.contacto_telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {sujeto.contacto_telefono}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <SujetoForm
          expedienteId={expedienteId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            onSujetoCreated();
          }}
        />
      )}
    </div>
  );
};

export default CuadranteSujetos;
