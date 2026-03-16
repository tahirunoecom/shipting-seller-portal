import { forwardRef } from 'react'
import { cn } from '@/utils/helpers'

const Input = forwardRef(
  ({ className, type = 'text', label, error, helperText, size = 'sm', ...props }, ref) => {
    // Size variants
    const sizeClasses = {
      sm: 'py-2.5 text-sm',
      md: 'py-3 text-base',
      lg: 'py-3.5 text-lg',
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          style={{ color: '#111827' }} // Force dark text color
          className={cn(
            'w-full rounded-lg border bg-white px-4 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2',
            '!text-gray-900 font-medium', // Force text color with !important equivalent
            sizeClasses[size],
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
            'dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:placeholder-dark-muted',
            className
          )}
          autoComplete="off"
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-muted">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
