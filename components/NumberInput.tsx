import React, { useState, useEffect } from 'react';

interface NumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  allowDecimals?: boolean;
  step?: number;
}

/**
 * Enhanced NumberInput component with proper mobile keyboard support
 * Automatically triggers numeric keypad on iOS and Android devices
 */
export default function NumberInput({ 
  value, 
  onChange, 
  placeholder, 
  min, 
  max, 
  className = '', 
  disabled = false,
  allowDecimals = false,
  step = 1
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Allow empty string for clearing
    if (newValue === '') {
      onChange(min || 0);
      return;
    }
    
    // Parse and validate number
    const numValue = allowDecimals ? parseFloat(newValue) : parseInt(newValue);
    if (!isNaN(numValue)) {
      // Apply min/max constraints
      let constrainedValue = numValue;
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max;
      }
      onChange(constrainedValue);
    }
  };

  const handleBlur = () => {
    // If empty on blur, set to minimum value or 0
    if (inputValue === '' || isNaN(parseFloat(inputValue))) {
      const defaultValue = min || 0;
      setInputValue(defaultValue.toString());
      onChange(defaultValue);
    }
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      pattern={allowDecimals ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border border-border rounded-md 
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
        disabled:bg-muted disabled:cursor-not-allowed
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${className}
      `}
    />
  );
}

interface NumericTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowOnly?: 'numbers' | 'digits-and-letters';
  dir?: 'ltr' | 'rtl';
}

/**
 * NumericTextInput for DATACO numbers and similar inputs
 * Shows numeric keypad on mobile while allowing text processing
 */
export function NumericTextInput({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  allowOnly = 'numbers',
  dir = 'ltr'
}: NumericTextInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (allowOnly === 'numbers') {
      // Only allow numbers
      const numericValue = newValue.replace(/[^0-9]/g, '');
      onChange(numericValue);
    } else {
      // Allow digits and letters (for mixed inputs)
      const alphanumericValue = newValue.replace(/[^a-zA-Z0-9]/g, '');
      onChange(alphanumericValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      dir={dir}
      className={`
        w-full px-3 py-2 border border-border rounded-md 
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
        disabled:bg-muted disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
} 