import React from 'react'

export const Input = React.forwardRef(({
  label,
  error,
  icon: Icon = null,
  className = '',
  id,
  ...props
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="block text-[9px] font-extrabold text-text-tertiary uppercase tracking-widest"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          className={`
            w-full pl-4 pr-10 py-3.5 rounded-xl glass-input text-xs font-mono tracking-wide placeholder-text-muted
            ${Icon ? 'pl-4 pr-11' : ''}
            ${error ? 'border-status-error/45 focus:border-status-error focus:ring-status-error/20' : ''}
            ${className}
          `}
          {...props}
        />
        {Icon && (
          <div className="absolute right-4 top-3.5 text-text-muted select-none pointer-events-none">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {error && (
        <span className="block text-[10px] font-semibold text-status-error animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'
