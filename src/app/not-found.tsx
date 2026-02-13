import Link from "next/link";
import { FileX } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <FileX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground">
        La página que buscas no existe.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Volver al Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
