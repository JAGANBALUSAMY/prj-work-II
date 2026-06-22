import React from 'react'

export const CircularProgress = ({
  score = 0,
  label = '',
  size = 96,
  strokeWidth = 6.5,
  className = '',
}) => {
  const radius = (size - strokeWidth - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference
  
  // Decide stroke color class based on score value
  let scoreColor = 'stroke-brand-indigo'
  if (score >= 80) scoreColor = 'stroke-status-success'
  else if (score >= 50) scoreColor = 'stroke-status-warning'
  else if (score > 0) scoreColor = 'stroke-status-error'

  return (
    <div className={`flex flex-col items-center p-6 rounded-2xl glass-panel hover:border-border-glow transition-all duration-300 relative group overflow-hidden ${className}`}>
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-brand-indigo/3 rounded-full blur-xl pointer-events-none group-hover:bg-brand-indigo/5 transition-colors"></div>
      
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-bg-panel"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Foreground Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`transition-all duration-1000 ease-out ${scoreColor}`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-base font-extrabold text-text-primary tracking-tight font-sans">
          {score}%
        </span>
      </div>
      
      {label && (
        <span className="mt-3.5 text-[9px] font-extrabold text-text-tertiary uppercase tracking-widest text-center">
          {label}
        </span>
      )}
    </div>
  )
}
