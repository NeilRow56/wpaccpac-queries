import { Footer } from '@/components/site-home/footer'

import HeroSection from '@/components/site-home/hero-section'
import { HowItWorksSection } from '@/components/site-home/how-it-works-section'

import { PricingSection } from '@/components/site-home/pricing-section'

export default async function Home() {
  // Landing page can be viewed without session
  // Optional: you can still show different content if logged in

  return (
    <div className='text-foreground min-h-screen bg-black'>
      <HeroSection />
      <HowItWorksSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
