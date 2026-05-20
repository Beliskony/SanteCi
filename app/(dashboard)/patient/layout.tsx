// app/dashboard/patient/layout.tsx

import PatHeader from "@/app/frontend/components/dashboard/patient/PatHeader";
import PatSideBar from "@/app/frontend/components/dashboard/patient/PatSideBar";

export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fb]">
      {/* Sidebar fixe à gauche */}
      <PatSideBar />

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">
        <PatHeader />
        {children}
      </div>
    </div>
  );
}