import ExpedienteForm from "@/components/expedientes/expediente-form";

const NuevoExpedientePage = () => {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Nuevo Expediente
        </h2>
        <p className="text-muted-foreground">
          Crea un nuevo expediente para organizar una causa o litigio.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ExpedienteForm />
      </div>
    </div>
  );
};

export default NuevoExpedientePage;
