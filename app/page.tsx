import HeroSection from '@/app/frontend/components/home/HeroSection'
import SectionSpecialite from './frontend/components/home/SectionSpecialite'
import CommentCaMarche from './frontend/components/home/CommentCaMarche'
import SectionHopitaux from './frontend/components/home/SectionHopitaux'
import Testimonial from './frontend/components/home/Testimonial'
import MiniFAQ from './frontend/components/home/MiniFAQ'

function HomePage() {
  return (
    <div className='h-full'>
      <HeroSection />
      <SectionSpecialite />
      <CommentCaMarche />
      <SectionHopitaux />
      <Testimonial />
      <MiniFAQ />
    </div>
  )
}

export default HomePage