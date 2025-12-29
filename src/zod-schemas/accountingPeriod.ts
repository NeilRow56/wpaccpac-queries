// zod-schemas/asset-form-schema.ts
import * as z from 'zod'

export const accountingPeriodFormSchema = z
  .object({
    clientId: z.string().min(1, 'Client is required'),
    periodName: z.string().min(1, 'Period name is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isCurrent: z.preprocess(
      val => (val === undefined ? false : val),
      z.boolean()
    ),
    isOpen: z.preprocess(val => (val === undefined ? true : val), z.boolean())
  })
  .refine(
    data => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return end > start
    },
    {
      message: 'End date must be after start date',
      path: ['endDate']
    }
  )

export type AccountingPeriodFormValues = z.infer<
  typeof accountingPeriodFormSchema
>
