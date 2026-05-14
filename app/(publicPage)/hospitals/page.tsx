import HeroHopiSection from '@/app/frontend/components/hoptitalPage/HeroHopiSection'
import ResultSection from '@/app/frontend/components/hoptitalPage/ResultSection'

function page() {
  return (
    <div className='h-full w-full bg-white'>
        <HeroHopiSection />
        <ResultSection />
    </div>
  )
}

export default page