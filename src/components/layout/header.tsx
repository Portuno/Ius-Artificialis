"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

type HeaderProps = {
  handleToggleSidebar?: () => void;
};

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/expedientes": "Expedientes",
  "/expedientes/nuevo": "Nuevo Expediente",
  "/upload": "Carga de Documentos",
  "/documents": "Documentos Procesados",
  "/valuation": "Valoración Catastral",
  "/validation": "Validación de Datos",
  "/export": "Exportar Datos",
};

const Header = ({ handleToggleSidebar }: HeaderProps) => {
  const pathname = usePathname();

  const getTitle = () => {
    if (!pathname) return "Ius Artificialis";
    if (
      pathname.startsWith("/expedientes/") &&
      pathname !== "/expedientes" &&
      pathname !== "/expedientes/nuevo"
    ) {
      return "Expediente — Vista 360°";
    }
    if (pathname.startsWith("/documents/") && pathname !== "/documents") {
      return "Detalle de Documento";
    }
    return PAGE_TITLES[pathname] ?? "Ius Artificialis";
  };

  return (
    <header className="flex h-16 items-center border-b bg-card px-4 sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        {handleToggleSidebar && (
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            aria-label="Abrir navegación"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
          {getTitle()}
        </h1>
      </div>
    </header>
  );
};

export default Header;
