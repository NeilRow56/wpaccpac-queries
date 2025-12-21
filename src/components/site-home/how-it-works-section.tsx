import { Card } from '@/components/ui/card'
import { BarChart3, PlayCircle, Webhook, Workflow } from 'lucide-react'

const steps = [
  {
    icon: Webhook,
    title: 'Trigger',
    description:
      'Select appropriate accounts programme based upon size of entity.',
    details: [
      'Enter draft trial balance if available',
      'Complete initial data summary'
    ]
  },
  {
    icon: Workflow,
    title: 'Build Workflow',
    description: 'Complete current year schedules and update asset schedules.',
    details: [
      'Lead schedules - created from forms',
      'Upload pdf documents to online storage',
      'Create links to spreadsheets and pdf documents',
      'Update assets for current year additions, disposals and depreciation'
    ]
  },
  {
    icon: PlayCircle,
    title: 'Review and Monitor',
    description:
      'Complete outstanding items on lead schedules and work programmes.',
    details: [
      'Draft queries for review',
      'Ensure all items that exceed tolerable error are scheduled'
    ]
  },
  {
    icon: BarChart3,
    title: 'Finalise',
    description:
      'Review of file and update of schedules to reflect final accounts ajustments',
    details: [
      'Ensure all queries signed off',
      'Schedules agreed to final trial balance',
      'Team collaboration - feed back'
    ]
  }
]

export function HowItWorksSection() {
  return (
    <section id='workflows' className='bg-gray-100 px-6 py-24 dark:bg-zinc-950'>
      <div className='container mx-auto max-w-7xl'>
        <div className='animate-fade-in mb-16 text-center'>
          <h2 className='bg-gradient-secondary mb-6 bg-clip-text text-4xl leading-tight font-bold text-transparent md:text-5xl'>
            How it works
          </h2>
          <p className='text-muted-foreground mx-auto max-w-2xl text-xl'>
            Build powerful automation workflows in minutes, not hours. No coding
            required.
          </p>
        </div>
      </div>
      <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4'>
        {steps.map((step, index) => (
          <div
            key={index}
            className='animate-fade-in'
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <Card className='bg-gradient-card border-primary/20 hover:shadow-glow-primary group relative p-8 backdrop-blur-sm transition-all duration-300 md:h-full'>
              <div className='mb-6'>
                <div className='bg-primary/10 group-hover::bg-primary/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors'>
                  <step.icon className='text-primary h-8 w-8' />
                </div>
                <div className='text-primary mb-2 text-sm font-semibold'>
                  Step {index + 1}
                </div>
                <h3 className='mb-3 text-2xl font-bold'>{step.title}</h3>
                <p className='text-muted-foreground mb-4'>{step.description}</p>
              </div>
              <div className='space-y-2'>
                {step.details.map((detail, detailIndex) => (
                  <div key={detailIndex} className='flex items-center gap-2'>
                    <div className='bg-primary animate-glow-pulse h-1.5 w-1.5 rounded-full'></div>
                    <span className='text-muted-foreground text-sm'>
                      {detail}
                    </span>
                  </div>
                ))}
              </div>
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className='from-primary/50 absolute top-1/2 -right-4 hidden h-0.5 w-8 bg-linear-to-r to-transparent lg:block'></div>
              )}
            </Card>
          </div>
        ))}
        <div className='h-60'></div>
      </div>
    </section>
  )
}
