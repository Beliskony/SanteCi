import FilterSection from '@/app/frontend/components/doctorPage/FilterSerction'
import RenderResultSection from '@/app/frontend/components/doctorPage/RenderResultSection'

function page() {
  return (
    <div className='h-full w-full bg-[#f4f6fb]'>
        <FilterSection />
        <RenderResultSection />
    </div>
  )
}

export default page