"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  labelClassName?: string
  dir?: "rtl" | "ltr"
}

interface InputFieldProps extends FormFieldProps {
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"]
  value: string | number
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  min?: number
  max?: number
  inputClassName?: string
}

interface TextareaFieldProps extends FormFieldProps {
  value: string
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  textareaClassName?: string
}

interface SelectFieldProps extends FormFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  options: { value: string; label: string }[]
  selectClassName?: string
}

interface CheckboxFieldProps extends Omit<FormFieldProps, 'htmlFor'> {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  checkboxClassName?: string
}

export function FormField({ children, label, htmlFor, error, hint, required, className, labelClassName, dir = "rtl" }: React.PropsWithChildren<FormFieldProps>) {
  return (
    <div className={cn("space-y-2", className)} dir={dir}>
      <Label 
        htmlFor={htmlFor} 
        className={cn(
          "text-sm font-medium text-foreground",
          required && "after:content-['*'] after:ml-0.5 after:text-red-500",
          labelClassName
        )}
      >
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function InputField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  labelClassName,
  dir = "rtl",
  type = "text",
  value,
  onChange,
  placeholder,
  min,
  max,
  inputClassName,
  ...props
}: InputFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'placeholder' | 'min' | 'max'>) {
  return (
    <FormField
      label={label}
      htmlFor={htmlFor}
      error={error}
      hint={hint}
      required={required}
      className={className}
      labelClassName={labelClassName}
      dir={dir}
    >
      <Input
        id={htmlFor}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        className={cn(
          dir === "rtl" && "text-right",
          inputClassName
        )}
        required={required}
        {...props}
      />
    </FormField>
  )
}

export function TextareaField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  labelClassName,
  dir = "rtl",
  value,
  onChange,
  placeholder,
  rows = 3,
  textareaClassName,
  ...props
}: TextareaFieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'placeholder' | 'rows'>) {
  return (
    <FormField
      label={label}
      htmlFor={htmlFor}
      error={error}
      hint={hint}
      required={required}
      className={className}
      labelClassName={labelClassName}
      dir={dir}
    >
      <Textarea
        id={htmlFor}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          dir === "rtl" && "text-right",
          textareaClassName
        )}
        required={required}
        {...props}
      />
    </FormField>
  )
}

export function SelectField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  labelClassName,
  dir = "rtl",
  value,
  onChange,
  placeholder,
  options,
  selectClassName,
  ...props
}: SelectFieldProps & Omit<React.ComponentProps<typeof SelectTrigger>, 'value' | 'onChange' | 'placeholder'>) {
  return (
    <FormField
      label={label}
      htmlFor={htmlFor}
      error={error}
      hint={hint}
      required={required}
      className={className}
      labelClassName={labelClassName}
      dir={dir}
    >
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={htmlFor} className={cn(selectClassName)} {...props}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent dir={dir}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

export function CheckboxField({
  id,
  label,
  error,
  hint,
  required,
  className,
  labelClassName,
  dir = "rtl",
  checked,
  onCheckedChange,
  checkboxClassName,
  ...props
}: CheckboxFieldProps & Omit<React.ComponentProps<typeof Checkbox>, 'checked' | 'onCheckedChange'>) {
  return (
    <div className={cn("space-y-2", className)} dir={dir}>
      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox 
          id={id} 
          checked={checked} 
          onCheckedChange={onCheckedChange}
          className={checkboxClassName}
          {...props}
        />
        <Label 
          htmlFor={id} 
          className={cn("text-sm font-medium text-foreground", labelClassName)}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
} 