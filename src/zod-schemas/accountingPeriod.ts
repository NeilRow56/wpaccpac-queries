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

// DB server boundary Schemas
export const createAccountingPeriodSchema = z.object({
  clientId: z.uuid(),
  periodName: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().default(false)
})

export const closeAccountingPeriodSchema = z.object({
  periodId: z.uuid(),
  clientId: z.uuid()
})

export type CloseAccountingPeriodInput = z.infer<
  typeof closeAccountingPeriodSchema
>

export const rollAccountingPeriodSchema = z
  .object({
    clientId: z.uuid(),
    periodName: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date()
  })
  .refine(d => d.endDate > d.startDate, {
    message: 'End date must be after start date'
  })
