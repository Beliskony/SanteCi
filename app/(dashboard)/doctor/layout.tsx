// app/dashboard/doctor/layout.tsx
import DocSideBar from "@/app/frontend/components/dashboard/doctor/DocSideBar";

export default function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fb]">
      {/* Sidebar fixe à gauche */}
      <DocSideBar />

    </div>
  );
}