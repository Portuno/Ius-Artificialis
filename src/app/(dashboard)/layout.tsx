"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleOpenSidebar = () => {
    setIsMobileSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleCloseSidebar();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar + overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex transition-opacity duration-200 lg:hidden",
          isMobileSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        aria-hidden={!isMobileSidebarOpen}
      >
        <div
          className="absolute inset-0 bg-black/40"
          aria-label="Cerrar navegación"
          role="button"
          tabIndex={0}
          onClick={handleCloseSidebar}
          onKeyDown={handleOverlayKeyDown}
        />
        <div className="relative z-50 h-full">
          <Sidebar />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden h-screen lg:flex">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header handleToggleSidebar={handleOpenSidebar} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
