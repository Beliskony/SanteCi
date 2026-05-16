import MessagerieLayout from "@/app/frontend/components/dashboard/messagesComponents/MessagerieLayout"
import PatHeader from "@/app/frontend/components/dashboard/patient/PatHeader"

function page() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
        <PatHeader />
        <MessagerieLayout />
    </div>
  )
}

export default page