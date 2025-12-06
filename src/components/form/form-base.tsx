import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues
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

/* ----- Types ----- */
type FormControlProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues
> = {
  name: TName
  label: ReactNode
  description?: ReactNode
  control: ControllerProps<TFieldValues, TName, TTransformedValues>['control']
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

/* ----- FormBase ----- */
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
  horizontal
}: FormBaseProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const labelElement = (
          <>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
          </>
        )

        const controlElem = children({
          ...field,
          id: field.name,
          'aria-invalid': fieldState.invalid
        })

        const errorElem = fieldState.invalid && (
          <FieldError errors={[fieldState.error]} />
        )

        return (
          <Field
            data-invalid={fieldState.invalid}
            orientation={horizontal ? 'horizontal' : undefined}
            className='bg-transparent' // ensure Field wrapper is transparent
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

/* ----- Transparent Input Classes ----- */
const transparentInputClasses = `
  bg-transparent focus:bg-transparent hover:bg-transparent disabled:bg-transparent
  border-none
  text-current
  [&::-webkit-autofill]:bg-transparent [&::-webkit-autofill]:text-current
  [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-current
  [&::placeholder]:text-muted-foreground
`

/* ----- FormInput ----- */
export const FormInput: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {field => (
        <Input {...field} className={cn(transparentInputClasses, className)} />
      )}
    </FormBase>
  )
}

/* ----- FormNumberInput ----- */
export const FormNumberInput: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ onChange, value, ...field }) => (
        <Input
          {...field}
          type='number'
          value={value ?? ''}
          onChange={e => {
            const number = e.target.valueAsNumber
            onChange(isNaN(number) ? null : number)
          }}
          className={cn(transparentInputClasses, className)}
        />
      )}
    </FormBase>
  )
}

/* ----- FormTextarea ----- */
export const FormTextarea: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {field => (
        <Textarea
          {...field}
          className={cn(transparentInputClasses, className)}
        />
      )}
    </FormBase>
  )
}

/* ----- FormSelect ----- */
export const FormSelect: FormControlFunc<{
  children: ReactNode
  className?: string
}> = ({ children, className, ...props }) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, ...field }) => (
        <Select {...field} onValueChange={onChange}>
          <SelectTrigger
            id={field.id}
            onBlur={onBlur}
            aria-invalid={field['aria-invalid']}
            className={cn(transparentInputClasses, className)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>
      )}
    </FormBase>
  )
}

/* ----- FormCheckbox ----- */
export const FormCheckbox: FormControlFunc = props => {
  return (
    <FormBase {...props} horizontal controlFirst>
      {({ onChange, value, ...field }) => (
        <Checkbox {...field} checked={value} onCheckedChange={onChange} />
      )}
    </FormBase>
  )
}

/* ----- FormPasswordInput ----- */
export const FormPasswordInput: FormControlFunc<{ className?: string }> = ({
  className,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const Icon = showPassword ? EyeOffIcon : EyeIcon

  return (
    <FormBase {...props}>
      {field => (
        <div className='flex rounded-md border-none bg-transparent'>
          <Input
            {...field}
            type={showPassword ? 'text' : 'password'}
            autoComplete='off'
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
            <span className='sr-only'>
              {showPassword ? 'Hide password' : 'Show password'}
            </span>
          </Button>
        </div>
      )}
    </FormBase>
  )
}
