import React from 'react'
import NavBar from '@/components/navbar/NavBar'
import { MainComponent } from '@/components/askAi/AskAiComponents'
const page = () => {

  return (
    <div className='h-screen w-screen bg-black flex'>
      <NavBar defaultValue={"askAi"} />
      <MainComponent/>
      
    </div>
  )
}

export default page