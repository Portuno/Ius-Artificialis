"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface SujetoFormProps {
  expedienteId: string;
  onClose: () => void;
  onCreated: () => void;
}

const SujetoForm = ({ expedienteId, onClose, onCreated }: SujetoFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: "",
    tipo_persona: "fisica",
    dni_cif: "",
    rol_procesal: "otro",
    contacto_email: "",
    contacto_telefono: "",
    direccion: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre_completo.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/sujetos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear sujeto");
      }

      toast.success("Sujeto agregado correctamente");
      onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear sujeto"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Sujeto</DialogTitle>
          <DialogDescription>
            Registra una persona fisica o juridica vinculada al expediente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_completo">
              Nombre Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre_completo"
              placeholder="Nombre y apellidos o razon social"
              value={form.nombre_completo}
              onChange={(e) => handleChange("nombre_completo", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipo_persona">Tipo</Label>
              <Select
                value={form.tipo_persona}
                onValueChange={(v) => handleChange("tipo_persona", v)}
              >
                <SelectTrigger id="tipo_persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Persona Fisica</SelectItem>
                  <SelectItem value="juridica">Persona Juridica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol_procesal">Rol</Label>
              <Select
                value={form.rol_procesal}
                onValueChange={(v) => handleChange("rol_procesal", v)}
              >
                <SelectTrigger id="rol_procesal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="causante">Causante</SelectItem>
                  <SelectItem value="heredero">Heredero</SelectItem>
                  <SelectItem value="acreedor">Acreedor</SelectItem>
                  <SelectItem value="deudor">Deudor</SelectItem>
                  <SelectItem value="notario">Notario</SelectItem>
                  <SelectItem value="testigo">Testigo</SelectItem>
                  <SelectItem value="emisor">Emisor</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni_cif">DNI / CIF</Label>
            <Input
              id="dni_cif"
              placeholder="12345678A o B12345678"
              value={form.dni_cif}
              onChange={(e) => handleChange("dni_cif", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contacto_email">Email</Label>
              <Input
                id="contacto_email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.contacto_email}
                onChange={(e) => handleChange("contacto_email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacto_telefono">Telefono</Label>
              <Input
                id="contacto_telefono"
                type="tel"
                placeholder="+34 600 000 000"
                value={form.contacto_telefono}
                onChange={(e) => handleChange("contacto_telefono", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Direccion</Label>
            <Input
              id="direccion"
              placeholder="Calle, numero, ciudad..."
              value={form.direccion}
              onChange={(e) => handleChange("direccion", e.target.value)}
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SujetoForm;
