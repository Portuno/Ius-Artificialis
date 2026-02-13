import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";

const ExpedienteDetailLoading = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header skeleton */}
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
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-primary" />
              <div className="h-8 w-48 rounded-md bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-5 w-24 rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="flex h-9 gap-2">
          <div className="h-9 w-36 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
        </div>
      </div>

      {/* Quadrants skeleton */}
      <div className="grid gap-4 lg:grid-cols-2" style={{ minHeight: "500px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4"
            aria-hidden
          >
            <div className="mb-3 h-5 w-32 rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 w-4/5 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 h-5 w-24 rounded bg-muted" />
        <div className="flex gap-4">
          <div className="h-16 w-1 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpedienteDetailLoading;
