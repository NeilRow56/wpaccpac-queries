import { Footer } from '@/components/site-home/footer'

import HeroSection from '@/components/site-home/hero-section'
import { HowItWorksSection } from '@/components/site-home/how-it-works-section'

import { PricingSection } from '@/components/site-home/pricing-section'

import { getSessionServer } from '@/lib/session'

import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getSessionServer()

  if (session == null) return redirect('/auth')

  return (
    <div className='text-foreground min-h-screen bg-black'>
      <HeroSection />
      <HowItWorksSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
