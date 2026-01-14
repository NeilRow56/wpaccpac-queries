import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  useFormState
} from 'react-hook-form'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel
} from '../ui/field'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Button } from '../ui/button'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ---------- Types ---------- */

type FormControlProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues
> = {
  name: TName
  label: ReactNode
  description?: ReactNode
  control: ControllerProps<TFieldValues, TName, TTransformedValues>['control']
  // ✅ NEW: show error even if untouched after user tries to submit
  showErrorOnSubmit?: boolean
}

type FormBaseProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues
> = FormControlProps<TFieldValues, TName, TTransformedValues> & {
  horizontal?: boolean
  controlFirst?: boolean
  children: (
    field: Parameters<
      ControllerProps<TFieldValues, TName, TTransformedValues>['render']
    >[0]['field'] & {
      'aria-invalid': boolean
      id: string
    }
  ) => ReactNode
}

type FormControlFunc<
  ExtraProps extends Record<string, unknown> = Record<never, never>
> = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues
>(
  props: FormControlProps<TFieldValues, TName, TTransformedValues> & ExtraProps
) => ReactNode

/* ---------- FormBase ---------- */

function FormBase<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues
>({
  children,
  control,
  label,
  name,
  description,
  controlFirst,
  horizontal,
  showErrorOnSubmit
}: FormBaseProps<TFieldValues, TName, TTransformedValues>) {
  const { submitCount, isSubmitted } = useFormState({ control })

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const shouldShow = !!(
          fieldState.isTouched ||
          (showErrorOnSubmit && (isSubmitted || submitCount > 0))
        )

        const invalid = !!(fieldState.invalid && shouldShow)

        const labelElement = (
          <>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
          </>
        )

        const controlElem = children({
          ...field,
          id: field.name,
          'aria-invalid': invalid
        })

        const errorElem =
          invalid && fieldState.error ? (
            <FieldError errors={[fieldState.error]} />
          ) : null

        return (
          <Field
            data-invalid={invalid}
            orientation={horizontal ? 'horizontal' : undefined}
            className='bg-transparent'
          >
            {controlFirst ? (
              <>
                {controlElem}
                <FieldContent className='bg-transparent'>
                  {labelElement}
                  {errorElem}
                </FieldContent>
              </>
            ) : (
              <>
                <FieldContent className='bg-transparent'>
                  {labelElement}
                </FieldContent>
                {controlElem}
                {errorElem}
              </>
            )}
          </Field>
        )
      }}
    />
  )
}

/* ---------- Transparent Input Classes ---------- */

const transparentInputClasses = `
  bg-transparent focus:bg-transparent hover:bg-transparent disabled:bg-transparent
  border border-gray-100 text-current
  [&::-webkit-autofill]:bg-transparent [&::-webkit-autofill]:text-current
  [&::placeholder]:text-muted-foreground
`

/* ---------- FormInput ---------- */

export const FormInput: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, value, ...field }) => (
        <Input
          {...field}
          value={value ?? ''}
          onBlur={onBlur}
          onChange={e => {
            onChange(e)
            onBlur()
          }}
          className={cn(transparentInputClasses, className)}
        />
      )}
    </FormBase>
  )
}
export const FormInputDate: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, value, ...field }) => (
        <Input
          {...field}
          type='date'
          value={value ?? ''}
          onBlur={onBlur}
          onChange={e => {
            onChange(e)
            onBlur()
          }}
          className={cn(transparentInputClasses, className)}
        />
      )}
    </FormBase>
  )
}
export const FormInputNumberString: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, value, ...field }) => (
        <Input
          {...field}
          type='number'
          value={value ?? ''}
          onBlur={onBlur}
          onChange={e => {
            onChange(e)
            onBlur()
          }}
          className={cn(transparentInputClasses, className)}
        />
      )}
    </FormBase>
  )
}

/* ---------- FormNumberInput ---------- */

export const FormNumberInput: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, value, ...field }) => (
        <Input
          {...field}
          type='number'
          value={value ?? ''}
          onBlur={onBlur}
          onChange={e => {
            const number = e.target.valueAsNumber
            onChange(isNaN(number) ? null : number)
            onBlur()
          }}
          className={cn(transparentInputClasses, className)}
        />
      )}
    </FormBase>
  )
}

/* ---------- FormTextarea ---------- */

export const FormTextarea: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, value, ...field }) => (
        <Textarea
          {...field}
          value={value ?? ''}
          onBlur={onBlur}
          onChange={e => {
            onChange(e)
            onBlur()
          }}
          className={cn(transparentInputClasses, className)}
        />
      )}
    </FormBase>
  )
}

/* ---------- FormSelect (touch-fixed) ---------- */

export const FormSelect: FormControlFunc<{
  children: ReactNode
  className?: string
}> = ({ children, className, ...props }) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, value, name, ...field }) => (
        <Select
          name={name}
          value={value}
          onValueChange={val => {
            onChange(val)
            onBlur() // mark touched
          }}
          onOpenChange={open => {
            if (!open) onBlur() // closing → touched
          }}
        >
          <SelectTrigger
            id={field.id}
            aria-invalid={field['aria-invalid']}
            className={cn(transparentInputClasses, className)}
          >
            <SelectValue placeholder='Select...' />
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>
      )}
    </FormBase>
  )
}

/* ---------- FormCheckbox ---------- */

export const FormCheckbox: FormControlFunc = props => {
  return (
    <FormBase {...props} horizontal controlFirst>
      {({ onChange, onBlur, value, ...field }) => (
        <Checkbox
          {...field}
          checked={value}
          onCheckedChange={checked => {
            onChange(checked)
            onBlur()
          }}
          onBlur={onBlur}
        />
      )}
    </FormBase>
  )
}

/* ---------- FormPasswordInput ---------- */

export const FormPasswordInput: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const Icon = showPassword ? EyeOffIcon : EyeIcon

  return (
    <FormBase {...props}>
      {({ onChange, onBlur, value, ...field }) => (
        <div className='flex rounded-md border-none bg-transparent'>
          <Input
            {...field}
            type={showPassword ? 'text' : 'password'}
            autoComplete='off'
            value={value ?? ''}
            onBlur={onBlur}
            onChange={e => {
              onChange(e)
              onBlur()
            }}
            className={cn(transparentInputClasses, 'border-none', className)}
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='bg-transparent'
            onClick={() => setShowPassword(p => !p)}
          >
            <Icon className='size-5' />
          </Button>
        </div>
      )}
    </FormBase>
  )
}
