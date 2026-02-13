import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ExpedienteCard from "@/components/expedientes/expediente-card";
import { Plus, FolderOpen } from "lucide-react";

const ExpedientesPage = async () => {
  const supabase = await createClient();

  const { data: expedientes } = await supabase
    .from("expedientes")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expedientes</h2>
          <p className="text-muted-foreground">
            Gestiona tus causas y litigios. Cada expediente agrupa documentos,
            sujetos, bienes y datos financieros.
          </p>
        </div>
        <Link
          href="/expedientes/nuevo"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          aria-label="Crear nuevo expediente"
          tabIndex={0}
        >
          <Plus className="h-4 w-4" />
          Nuevo Expediente
        </Link>
      </div>

      {!expedientes || expedientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">Sin expedientes</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Crea tu primer expediente para empezar a organizar documentos,
            sujetos y bienes por causa.
          </p>
          <Link
            href="/expedientes/nuevo"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Crear Expediente
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {expedientes.map((expediente) => (
            <ExpedienteCard key={expediente.id} expediente={expediente} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpedientesPage;
