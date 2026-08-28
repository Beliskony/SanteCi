// app/dashboard/patient/layout.tsx
import { CallGlobalListener } from "@/app/frontend/components/dashboard/callComponents/CallGlocalListener";
import PatSideBar from "@/app/frontend/components/dashboard/patient/PatSideBar";
import RouteGuard from "@/app/frontend/components/layouts/RouteGuard";

export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard>
      <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fb]">
        {/* Sidebar fixe à gauche */}
        <PatSideBar />
        {/* <CallGlobalListener /> */}
      </div>
    </RouteGuard>
  );
}