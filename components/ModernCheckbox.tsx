'use client';

import { Check } from 'lucide-react';
import { forwardRef } from 'react';

interface ModernCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  id?: string;
}

const ModernCheckbox = forwardRef<HTMLInputElement, ModernCheckboxProps>(
  ({ checked = false, onChange, disabled = false, size = 'md', label, className = '', id }, ref) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5', 
      lg: 'w-6 h-6'
    };

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4'
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange && !disabled) {
        onChange(e.target.checked);
      }
    };

    const checkboxElement = (
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          id={id}
        />
        <div
          className={`
            ${sizeClasses[size]}
            border-2 rounded-md transition-all duration-200 ease-in-out cursor-pointer
            ${checked 
              ? 'bg-primary border-primary shadow-md' 
              : 'bg-background border-border hover:border-primary/50'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:shadow-sm active:scale-95'
            }
            flex items-center justify-center
          `}
          onClick={() => !disabled && onChange && onChange(!checked)}
        >
          <Check 
            className={`
              ${iconSizes[size]} 
              text-primary-foreground transition-all duration-200 ease-in-out
              ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
            `}
            strokeWidth={3}
          />
        </div>
      </div>
    );

    if (label) {
      return (
        <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
          {checkboxElement}
          <span className="text-sm font-medium text-foreground select-none">
            {label}
          </span>
        </label>
      );
    }

    return checkboxElement;
  }
);

ModernCheckbox.displayName = 'ModernCheckbox';

export default ModernCheckbox; 