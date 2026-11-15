"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import PlanLimitBanner from "@/components/admin/PlanLimitBanner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface overflow-x-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        {/* PlanLimitBanner — tampil di SEMUA halaman admin: suspended, expired, kamar mendekati limit */}
        <PlanLimitBanner />
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
