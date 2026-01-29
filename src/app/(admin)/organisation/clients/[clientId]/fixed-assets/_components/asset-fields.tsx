'use client'

import Link from 'next/link'
import * as React from 'react'
import type { Control, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'

import { SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { FormDescription } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'

import {
  FormSelect,
  FormInput,
  FormTextarea,
  FormInputDate,
  FormInputNumberString
} from '@/components/form/form-base'

type Category = { id: string; name: string; clientId: string }

/**
 * Minimal shared keys needed by AssetFields.
 * (Works for both AssetFormInput and CreateHistoricAssetInput.)
 */
type AssetFieldsShape = {
  categoryId: string
  name: string
  description?: string
  acquisitionDate: string
  originalCost: string
  costAdjustment: string
  depreciationMethod: 'straight_line' | 'reducing_balance'
  depreciationRate: string

  // ✅ new
  isFinanceLease?: boolean
}

type AssetFieldsProps<T extends FieldValues & AssetFieldsShape> = {
  control: Control<T>
  watchClientId?: string
  clientIdForLinks: string
  categories: Category[]
}

export function AssetFields<T extends FieldValues & AssetFieldsShape>({
  control,
  watchClientId,
  clientIdForLinks,
  categories
}: AssetFieldsProps<T>) {
  const filteredCategories = watchClientId
    ? categories.filter(cat => cat.clientId === watchClientId)
    : categories

  // Paths (strongly typed)
  const categoryIdName = 'categoryId' as Path<T>
  const nameName = 'name' as Path<T>
  const descName = 'description' as Path<T>
  const acquisitionDateName = 'acquisitionDate' as Path<T>
  const originalCostName = 'originalCost' as Path<T>
  const costAdjustmentName = 'costAdjustment' as Path<T>
  const depreciationMethodName = 'depreciationMethod' as Path<T>
  const depreciationRateName = 'depreciationRate' as Path<T>
  const isFinanceLeaseName = 'isFinanceLease' as Path<T>

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      {/* ---------------- Asset details ---------------- */}
      <section className='text-primary space-y-4 font-bold'>
        <h3 className='text-muted-foreground text-sm font-semibold'>
          Asset details
        </h3>

        <div className='space-y-2'>
          <FormSelect<T>
            control={control}
            name={categoryIdName}
            label='Category'
            className='font-normal text-gray-900'
            showErrorOnSubmit
          >
            {filteredCategories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </FormSelect>

          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>
              Missing a category?
            </span>
            <Button asChild variant='link' className='h-auto p-0 text-xs'>
              <Link
                href={`/organisation/clients/${clientIdForLinks}/asset-categories`}
              >
                Add asset category
              </Link>
            </Button>
          </div>
        </div>

        {/* ✅ Finance lease toggle (shared) */}
        <Controller
          control={control}
          name={isFinanceLeaseName}
          render={({ field }) => (
            <div className='bg-muted/10 flex items-start gap-3 rounded-md border p-3'>
              <Checkbox
                checked={!!field.value}
                onCheckedChange={v => field.onChange(v === true)}
              />

              <div className='space-y-0.5'>
                <div className='text-foreground text-sm font-medium'>
                  Finance lease
                </div>
                <div className='text-muted-foreground text-xs'>
                  Mark this asset as held under a finance lease (included in
                  finance lease totals and disclosures).
                </div>
              </div>
            </div>
          )}
        />

        <FormInput<T>
          control={control}
          name={nameName}
          className='font-normal text-gray-900'
          label='Asset name'
          showErrorOnSubmit
        />
        <FormDescription className='text-muted-foreground font-light'>
          Add a serial / registration number if available.
        </FormDescription>

        <FormTextarea<T>
          className='min-h-24 font-normal text-gray-900'
          control={control}
          name={descName}
          label='Description'
          showErrorOnSubmit
        />

        <FormInputDate<T>
          control={control}
          className='font-normal text-gray-900'
          name={acquisitionDateName}
          label='Date of acquisition'
          showErrorOnSubmit
        />

        <FormInputNumberString<T>
          control={control}
          name={originalCostName}
          label='Original cost'
          className='font-normal text-gray-900'
          showErrorOnSubmit
        />

        <FormInputNumberString<T>
          control={control}
          name={costAdjustmentName}
          label='Cost adjustment'
          className='font-normal text-gray-900'
          showErrorOnSubmit
        />
        <FormDescription className='text-muted-foreground font-light'>
          Capitalised improvements or revaluation (added to cost).
        </FormDescription>
      </section>

      {/* ---------------- Depreciation ---------------- */}
      <section className='space-y-4'>
        <h3 className='text-primary text-sm font-semibold'>Depreciation</h3>

        <FormSelect<T>
          control={control}
          name={depreciationMethodName}
          label='Depreciation method'
          className='font-normal text-gray-900/70'
          showErrorOnSubmit
        >
          <SelectItem value='straight_line'>Straight line</SelectItem>
          <SelectItem value='reducing_balance'>Reducing balance</SelectItem>
        </FormSelect>

        <FormDescription className='text-muted-foreground font-light'>
          Straight line: equal charge each year. Reducing balance: higher charge
          in early years.
        </FormDescription>

        <FormInputNumberString<T>
          control={control}
          name={depreciationRateName}
          label='Depreciation rate (%)'
          className='font-normal text-gray-900'
          showErrorOnSubmit
        />
        <FormDescription className='text-muted-foreground font-light'>
          Annual rate (0–100). For straight line divide 100 by the asset life
          e.g. 5 year life = 20
        </FormDescription>
      </section>
    </div>
  )
}
