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
import { ReactNode, useState } from 'react'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Button } from '../ui/button'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

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
        const control = children({
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
          >
            {controlFirst ? (
              <>
                {control}
                <FieldContent>
                  {labelElement}
                  {errorElem}
                </FieldContent>
              </>
            ) : (
              <>
                <FieldContent>{labelElement}</FieldContent>
                {control}
                {errorElem}
              </>
            )}
          </Field>
        )
      }}
    />
  )
}

export const FormInput: FormControlFunc = props => {
  return (
    <FormBase {...props}>
      {field => <Input className='border-red-100' {...field} />}
    </FormBase>
  )
}
export const FormNumberInput: FormControlFunc = props => {
  return (
    <FormBase {...props}>
      {({ onChange, value }) => (
        <Input
          {...props}
          onChange={e => {
            const number = e.target.valueAsNumber
            onChange(isNaN(number) ? null : number)
          }}
          value={value ?? ''}
          type='number'
        />
      )}
    </FormBase>
  )
}

export const FormPasswordInput: FormControlFunc = props => {
  const [showPassword, setShowPassword] = useState(false)
  const Icon = showPassword ? EyeOffIcon : EyeIcon
  return (
    <FormBase {...props}>
      {field => (
        <div className='flex rounded-md border border-red-100'>
          <Input
            {...field}
            className='border-r-0 border-red-100'
            autoComplete='off'
            type={showPassword ? 'text' : 'password'}
          />
          <Button
            variant='ghost'
            size='icon'
            type='button'
            className=''
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

export const FormTextarea: FormControlFunc = props => {
  return <FormBase {...props}>{field => <Textarea {...field} />}</FormBase>
}

export const FormSelect: FormControlFunc<{ children: ReactNode }> = ({
  children,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, ...field }) => (
        <Select {...field} onValueChange={onChange}>
          <SelectTrigger
            aria-invalid={field['aria-invalid']}
            id={field.id}
            onBlur={onBlur}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>
      )}
    </FormBase>
  )
}

export const FormCheckbox: FormControlFunc = props => {
  return (
    <FormBase {...props} horizontal controlFirst>
      {({ onChange, value, ...field }) => (
        <Checkbox {...field} checked={value} onCheckedChange={onChange} />
      )}
    </FormBase>
  )
}
