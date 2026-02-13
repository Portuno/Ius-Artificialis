"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Scale,
  LayoutDashboard,
  Upload,
  FileText,
  MapPin,
  CheckSquare,
  Download,
  LogOut,
  FolderOpen,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expedientes", label: "Expedientes", icon: FolderOpen },
  { href: "/upload", label: "Carga de Documentos", icon: Upload },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/valuation", label: "Valoración Catastral", icon: MapPin },
  { href: "/validation", label: "Validación", icon: CheckSquare },
  { href: "/export", label: "Exportar", icon: Download },
];

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Scale className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight">
          Ius Artificialis
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname
            ? item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
            : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={item.label}
              tabIndex={0}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Cerrar sesión"
          tabIndex={0}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
