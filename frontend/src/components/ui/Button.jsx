import React from 'react'
import { Loader2 } from 'lucide-react'

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 outline-none focus:ring-2 focus:ring-brand-indigo/50 disabled:opacity-50 disabled:cursor-not-allowed select-none'
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-indigo to-brand-purple hover:from-brand-indigo/90 hover:to-brand-purple/90 text-white shadow-lg shadow-brand-indigo/20 active:scale-[0.98] hover:scale-[1.01]',
    secondary: 'bg-bg-panel hover:bg-bg-panel/80 border border-border-subtle hover:border-border-glow text-text-secondary hover:text-text-primary active:scale-[0.98]',
    outline: 'border border-border-subtle hover:border-brand-indigo bg-transparent text-text-secondary hover:text-brand-indigo active:scale-[0.98]',
    danger: 'bg-status-error-bg hover:bg-status-error/20 border border-status-error/30 text-status-error active:scale-[0.98]',
    ghost: 'hover:bg-bg-panel/40 text-text-tertiary hover:text-text-primary active:scale-[0.98]',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-[11px] gap-1.5',
    md: 'px-4.5 py-2.5 text-xs gap-2',
    lg: 'px-6 py-3.5 text-sm gap-2.5',
  }
  
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  )
})

Button.displayName = 'Button'
