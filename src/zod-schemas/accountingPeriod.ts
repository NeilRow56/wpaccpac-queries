// zod-schemas/asset-form-schema.ts
import * as z from 'zod'

export const accountingPeriodFormSchema = z
  .object({
    clientId: z.string().min(1, 'Client is required'),
    periodName: z.string().min(1, 'Period name is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isCurrent: z.coerce.boolean().default(false)
  })
  .refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate']
  })

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
  clientId: z.uuid(),
  periodId: z.uuid(),

  nextPeriod: z
    .object({
      periodName: z.string().min(1),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date'),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date')
    })
    .refine(d => d.endDate > d.startDate, {
      message: 'Next period end date must be after start date'
    })
})

export type CloseAccountingPeriodInput = z.infer<
  typeof closeAccountingPeriodSchema
>

export const rollAccountingPeriodSchema = z
  .object({
    clientId: z.uuid(),
    periodName: z.string().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date')
  })
  .refine(d => d.endDate > d.startDate, {
    message: 'End date must be after start date'
  })
