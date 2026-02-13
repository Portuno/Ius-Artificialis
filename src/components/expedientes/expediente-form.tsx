"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const ExpedienteForm = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    numero_expediente: "",
    titulo: "",
    cliente: "",
    tipo_causa: "otro",
    descripcion: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.numero_expediente.trim() || !form.titulo.trim()) {
      toast.error("Numero de expediente y titulo son obligatorios");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/expedientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear expediente");
      }

      const expedienteId = data.expediente.id as string;
      toast.success("Expediente creado correctamente");
      router.prefetch(`/expedientes/${expedienteId}`);
      startTransition(() => {
        router.push(`/expedientes/${expedienteId}`);
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear expediente"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="numero_expediente">
            Numero de Expediente <span className="text-destructive">*</span>
          </Label>
          <Input
            id="numero_expediente"
            placeholder="Ej: EXP-2026-001"
            value={form.numero_expediente}
            onChange={(e) => handleChange("numero_expediente", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="titulo">
            Titulo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="titulo"
            placeholder="Ej: Herencia Garcia Lopez"
            value={form.titulo}
            onChange={(e) => handleChange("titulo", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            placeholder="Nombre del cliente"
            value={form.cliente}
            onChange={(e) => handleChange("cliente", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo_causa">Tipo de Causa</Label>
          <Select
            value={form.tipo_causa}
            onValueChange={(value) => handleChange("tipo_causa", value)}
          >
            <SelectTrigger id="tipo_causa">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="herencia">Herencia</SelectItem>
              <SelectItem value="facturacion">Facturacion</SelectItem>
              <SelectItem value="litigio_civil">Litigio Civil</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripcion</Label>
        <Textarea
          id="descripcion"
          placeholder="Descripcion breve del caso..."
          value={form.descripcion}
          onChange={(e) => handleChange("descripcion", e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creando..." : "Crear Expediente"}
        </button>
      </div>
    </form>
  );
};

export default ExpedienteForm;
