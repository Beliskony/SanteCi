import HerosectionTele from '@/app/frontend/components/teleconsultation/HerosectionTele'
import HowItWork from '@/app/frontend/components/teleconsultation/HowItWork'
import Prerequis from '@/app/frontend/components/teleconsultation/Prerequis'
import React from 'react'

function page() {
  return (
    <div className='flex flex-col h-full w-full bg-white'>
        <HerosectionTele />
        <HowItWork />
        <Prerequis />
    </div>
  )
}

export default page