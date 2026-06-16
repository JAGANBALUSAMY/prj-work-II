import React, { useState } from 'react'

export const Tooltip = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  const [show, setShow] = useState(false)

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-bg-panel border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-bg-panel border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-bg-panel border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-bg-panel border-y-transparent border-l-transparent',
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className={`
            absolute z-[80] w-48 p-2 text-[10px] text-text-secondary bg-bg-panel border border-border-subtle rounded-lg shadow-xl pointer-events-none animate-fadeIn leading-relaxed font-light
            ${positions[position]}
            ${className}
          `}
        >
          {content}
          <div 
            className={`
              absolute border-[4px]
              ${arrows[position]}
            `}
          />
        </div>
      )}
    </div>
  )
}
