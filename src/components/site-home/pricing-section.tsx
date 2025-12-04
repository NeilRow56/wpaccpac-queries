import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, Crown, Zap } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '£0 ',
    period: 'forever',
    description: 'Perfect for getting started with workflow automation',
    icon: Zap,
    popular: false,
    features: [
      '100 workflow runs/month',
      '5 active workflows',
      'Basic integrations',
      'Community support',
      'Workflow templates',
      'Basic monitoring'
    ],
    buttonText: 'Start Free',
    buttonVariant: 'secondary' as const
  },
  {
    name: 'Pro',
    price: '£29 ',
    period: 'per month',
    description: 'For teams ready to scale their automation workflows',
    icon: Crown,
    popular: true,
    features: [
      'Unlimited active workflows',
      'All integrations + AI nodes',
      'Priority support',
      'Advanced templates',
      'Real-time monitoring',
      'Team collaboration',
      'Custom webhooks',
      'Error retry logic'
    ],
    buttonText: 'Start Pro Trial',
    buttonVariant: 'hero' as const
  },
  {
    name: 'Free',
    price: '£0 ',
    period: 'forever',
    description: 'Perfect for getting started with workflow automation',
    icon: Zap,
    popular: false,
    features: [
      '100 workflow runs/month',
      '5 active workflows',
      'Basic integrations',
      'Community support',
      'Workflow templates',
      'Basic monitoring'
    ],
    buttonText: 'Start Free',
    buttonVariant: 'secondary' as const
  }
]

export function PricingSection() {
  return (
    <section id='pricing' className='bg-gray-100 px-6 py-24 dark:bg-zinc-950'>
      <div className='container mx-auto max-w-7xl'>
        <div className='animate-fade-in mb-16 text-center'>
          <h2 className='bg-gradient-primary mb-6 bg-clip-text text-4xl font-bold text-transparent md:text-5xl'>
            Simple, Transparent Pricing
          </h2>
          <p className='text-muted-foreground mx-auto max-w-3xl text-xl'>
            Start Free, scale as you grow. No hidden fees, no surprises. Cancel
            anytime.
          </p>
        </div>
        <div className='mb-16 grid grid-cols-1 gap-8 md:grid-cols-3'>
          {plans.map((plan, index) => (
            <div
              key={index}
              className='animate-fade-in'
              style={{ animationDelay: `{index * 0.1}s` }}
            >
              <Card
                className={`relative h-full p-8 ${
                  plan.popular
                    ? 'bg-gradient-card border-primary/50 shadow-glow-primary border-2'
                    : 'bg-gradient-card border-primary/20 border'
                } hover:shadow-glass backdrop-blur-sm transition-all duration-300`}
              >
                {plan.popular && (
                  <Badge className='absolute -top-3 left-1/2 -translate-x-1/2 transform'>
                    Most popular
                  </Badge>
                )}
                <div className='mb-8 text-center'>
                  <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-200'>
                    <plan.icon className='text-primary h-8 w-8' />
                  </div>
                  <h3 className='mb-2 text-2xl font-bold'>{plan.name}</h3>
                  <div className='mb-4'>
                    <span className='text-4xl font-bold'>{plan.price}</span>
                    <span className='text-muted-foreground ml-2'>
                      {plan.period}
                    </span>
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    {plan.description}
                  </p>
                </div>
                <div className='mb-8 space-y-4'>
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className='flex items-center gap-3'>
                      <Check className='text-primary h-5 w-5 shrink-0' />
                      <span className='text-sm'>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className='w-full'
                  size='lg'
                  variant={plan.buttonVariant}
                >
                  {plan.buttonText}
                </Button>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
