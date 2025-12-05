import { Footer } from '@/components/site-home/footer'

import HeroSection from '@/components/site-home/hero-section'
import { HowItWorksSection } from '@/components/site-home/how-it-works-section'
import { Navbar } from '@/components/site-home/navbar'
import { PricingSection } from '@/components/site-home/pricing-section'

export default async function Home() {
  return (
    <div className='text-foreground min-h-screen bg-black'>
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
