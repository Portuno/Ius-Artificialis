import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  ScrollText,
  MapPin,
  ArrowRight,
  FolderOpen,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DashboardPage = async () => {
  const supabase = await createClient();

  // Fetch counts
  const { count: totalDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });

  const { count: pendingDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "extracted");

  const { count: validatedDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "validated");

  const { count: invoiceCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  const { count: deedCount } = await supabase
    .from("inheritance_deeds")
    .select("*", { count: "exact", head: true });

  const { count: propertyCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true });

  const { count: alertCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("alerta_fiscal", true);

  // Fetch recent documents
  const { data: recentDocs } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch recent expedientes
  const { data: recentExpedientes } = await supabase
    .from("expedientes")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5);

  const { count: expedienteCount } = await supabase
    .from("expedientes")
    .select("*", { count: "exact", head: true });

  // Estimate time saved (approx 25 min per doc manually, 2 min with IA)
  const timeSavedMinutes = (totalDocs ?? 0) * 23;
  const timeSavedHours = (timeSavedMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Documentos Procesados"
          value={totalDocs ?? 0}
          icon={FileText}
          color="text-primary"
        />
        <StatCard
          title="Pendientes de Validación"
          value={pendingDocs ?? 0}
          icon={Clock}
          color="text-warning"
        />
        <StatCard
          title="Validados"
          value={validatedDocs ?? 0}
          icon={CheckCircle2}
          color="text-success"
        />
        <StatCard
          title="Tiempo Ahorrado"
          value={`${timeSavedHours}h`}
          icon={Clock}
          color="text-gold"
          subtitle="vs. proceso manual"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <Receipt className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-2xl font-bold">{invoiceCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              Facturas Extraídas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <ScrollText className="h-8 w-8 text-amber-600" />
          <div>
            <p className="text-2xl font-bold">{deedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              Escrituras Analizadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <MapPin className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold">{propertyCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              Inmuebles Identificados
              {(alertCount ?? 0) > 0 && (
                <span className="ml-1 text-destructive">
                  ({alertCount} alerta{(alertCount ?? 0) !== 1 ? "s" : ""})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Expedientes Recientes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Expedientes Recientes
            {(expedienteCount ?? 0) > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({expedienteCount} total{(expedienteCount ?? 0) !== 1 ? "es" : ""})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <Link
              href="/expedientes"
              className="text-sm text-primary hover:underline"
              aria-label="Ver todos los expedientes"
            >
              Ver todos
            </Link>
            <Link
              href="/expedientes/nuevo"
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label="Crear nuevo expediente"
            >
              <Plus className="h-3 w-3" />
              Crear expediente
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!recentExpedientes || recentExpedientes.length === 0 ? (
            <div className="col-span-full rounded-lg border bg-card p-6 text-center">
              <FolderOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Sin expedientes.{" "}
                <Link
                  href="/expedientes/nuevo"
                  className="font-medium text-primary hover:underline"
                  aria-label="Crear primer expediente"
                >
                  Crear primer expediente
                </Link>
              </p>
            </div>
          ) : (
            recentExpedientes.map((exp) => (
              <Link
                key={exp.id}
                href={`/expedientes/${exp.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 hover:border-primary/30"
              >
                <FolderOpen className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{exp.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.numero_expediente}
                    {exp.cliente ? ` · ${exp.cliente}` : ""}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    exp.estado === "abierto"
                      ? "bg-success/10 text-success border-success/30 text-[10px]"
                      : exp.estado === "en_proceso"
                        ? "bg-warning/10 text-warning border-warning/30 text-[10px]"
                        : "text-[10px]"
                  }
                >
                  {exp.estado === "abierto"
                    ? "Abierto"
                    : exp.estado === "en_proceso"
                      ? "En Proceso"
                      : exp.estado === "cerrado"
                        ? "Cerrado"
                        : "Archivado"}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions + Recent Documents */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Acciones Rápidas</h3>
          <div className="space-y-2">
            <Link
              href="/upload"
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-primary" />
                <span className="font-medium">Cargar Documentos</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            {(pendingDocs ?? 0) > 0 && (
              <Link
                href="/validation"
                className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-4 transition-colors hover:bg-warning/10"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span className="font-medium">
                    {pendingDocs} documento{(pendingDocs ?? 0) !== 1 ? "s" : ""}{" "}
                    esperan validación
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-warning" />
              </Link>
            )}

            {(alertCount ?? 0) > 0 && (
              <Link
                href="/valuation"
                className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">
                    {alertCount} alerta{(alertCount ?? 0) !== 1 ? "s" : ""}{" "}
                    fiscal{(alertCount ?? 0) !== 1 ? "es" : ""} detectada
                    {(alertCount ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-destructive" />
              </Link>
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Documentos Recientes</h3>
            <Link
              href="/documents"
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="rounded-lg border bg-card">
            {!recentDocs || recentDocs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hay documentos todavía.
              </div>
            ) : (
              recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.file_name}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("es-ES")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat card component
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: number | string;
  icon: typeof FileText;
  color: string;
  subtitle?: string;
}) => (
  <div className="rounded-lg border bg-card p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{title}</p>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <p className="mt-2 text-3xl font-bold">{value}</p>
    {subtitle && (
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    )}
  </div>
);

export default DashboardPage;
