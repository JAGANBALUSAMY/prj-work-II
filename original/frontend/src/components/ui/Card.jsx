import React from 'react'

export const Card = ({
  children,
  hover = false,
  className = '',
  onClick,
  ...props
}) => {
  const isClickable = !!onClick
  
  return (
    <div
      onClick={onClick}
      className={`
        glass-panel rounded-2xl p-6 relative overflow-hidden
        ${hover || isClickable ? 'glass-panel-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Dynamic Glow Blob at top right */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-indigo/3 rounded-full blur-xl pointer-events-none"></div>
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-between gap-4 pb-4 border-b border-border-subtle ${className}`} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-sm font-bold text-text-primary tracking-tight font-sans ${className}`} {...props}>
    {children}
  </h3>
)

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-[10px] text-text-muted mt-1 leading-normal font-light uppercase tracking-wider ${className}`} {...props}>
    {children}
  </p>
)

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`pt-4 ${className}`} {...props}>
    {children}
  </div>
)

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`mt-6 pt-4 border-t border-border-subtle flex items-center justify-between gap-4 ${className}`} {...props}>
    {children}
  </div>
)
