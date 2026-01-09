/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import Link from 'next/link'
import { SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { FormDescription } from '@/components/ui/form'

import {
  FormSelect,
  FormInput,
  FormTextarea,
  FormInputDate,
  FormInputNumberString
} from '@/components/form/form-base'

/**
 * Minimal shared shape needed by AssetFields.
 * Works for both AssetFormValues and CreateHistoricAssetInput (they share these keys).
 */

type AssetFieldsProps = {
  control: any
  watchClientId?: string
  clientIdForLinks: string
  categories: Array<{ id: string; name: string; clientId: string }>
}

export function AssetFields({
  control,
  watchClientId,
  clientIdForLinks,
  categories
}: AssetFieldsProps) {
  const filteredCategories = watchClientId
    ? categories.filter(cat => cat.clientId === watchClientId)
    : categories

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      {/* ---------------- Asset details ---------------- */}
      <section className='space-y-4'>
        <h3 className='text-muted-foreground text-sm font-semibold'>
          Asset details
        </h3>

        <div className='space-y-2'>
          <FormSelect
            control={control}
            name={'categoryId' as any}
            label='Category'
            className='font-normal text-gray-900'
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

        <FormInput<any>
          control={control}
          name={'name' as any}
          className='font-normal text-gray-900'
          label='Asset name'
        />
        <FormDescription className='text-muted-foreground font-light'>
          Add a serial / registration number if available.
        </FormDescription>

        <FormTextarea
          className='min-h-24 font-normal text-gray-900'
          control={control}
          name={'description' as any}
          label='Description'
        />

        <FormInputDate<any>
          control={control}
          className='font-normal text-gray-900'
          name={'acquisitionDate' as any}
          label='Date of acquisition'
        />

        <FormInputNumberString<any>
          control={control}
          name={'originalCost' as any}
          label='Original cost'
          className='font-normal text-gray-900'
        />

        <FormInputNumberString<any>
          control={control}
          name={'costAdjustment' as any}
          label='Cost adjustment'
          className='font-normal text-gray-900'
        />
        <FormDescription className='text-muted-foreground font-light'>
          Capitalised improvements or revaluation (added to cost).
        </FormDescription>
      </section>

      {/* ---------------- Depreciation ---------------- */}
      <section className='space-y-4'>
        <h3 className='text-muted-foreground text-sm font-semibold'>
          Depreciation
        </h3>

        {/* You can keep your existing custom Select block here if you prefer.
            I’m using FormSelect for consistency + less code. */}
        <FormSelect
          control={control}
          name={'depreciationMethod' as any}
          label='Depreciation method'
          className='font-normal text-gray-900'
        >
          <SelectItem value='straight_line'>Straight line</SelectItem>
          <SelectItem value='reducing_balance'>Reducing balance</SelectItem>
        </FormSelect>

        <FormDescription className='text-muted-foreground font-light'>
          Straight line: equal charge each year. Reducing balance: higher charge
          in early years.
        </FormDescription>

        <FormInputNumberString<any>
          control={control}
          name={'depreciationRate' as any}
          label='Depreciation rate (%)'
          className='font-normal text-gray-900'
        />
        <FormDescription className='text-muted-foreground font-light'>
          Annual rate (0–100).
        </FormDescription>
      </section>
    </div>
  )
}
