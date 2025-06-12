'use client';

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernCheckboxProps {
  id?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const ModernCheckbox: React.FC<ModernCheckboxProps> = ({
  id,
  checked = false,
  onChange,
  label,
  className,
  disabled = false
}) => {
  const [isChecked, setIsChecked] = useState(checked);
  
  // Update internal state when prop changes
  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleChange = () => {
    if (disabled) return;
    
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        onClick={handleChange}
        className={cn(
          "w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer",
          isChecked 
            ? "bg-primary border-primary" 
            : "bg-background border-border hover:border-primary",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isChecked && (
          <Check className="h-3 w-3 text-primary-foreground" />
        )}
      </div>
      
      {label && (
        <label 
          onClick={disabled ? undefined : handleChange} 
          className={cn(
            "text-sm cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {label}
        </label>
      )}
      
      {id && !label && (
        <input 
          type="checkbox" 
          id={id}
          checked={isChecked}
          onChange={handleChange}
          className="sr-only"
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default ModernCheckbox; 