"use client";

import { usePathname } from "next/navigation";

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

const Header = () => {
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
    <header className="flex h-16 items-center border-b bg-card px-6">
      <h1 className="text-xl font-semibold tracking-tight">{getTitle()}</h1>
    </header>
  );
};

export default Header;
