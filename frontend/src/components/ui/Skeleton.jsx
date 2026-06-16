import React from 'react'

export const Skeleton = ({
  className = '',
  variant = 'text', // text, circle, rect
  ...props
}) => {
  const shapes = {
    text: 'h-3 w-full rounded-md',
    circle: 'rounded-full',
    rect: 'rounded-xl',
  }
  
  return (
    <div
      className={`bg-bg-panel/60 border border-border-subtle/30 animate-pulse ${shapes[variant]} ${className}`}
      {...props}
    />
  )
}

// Preset skeletons for easier dashboard loading state builds
export const KPISkeleton = () => (
  <div className="glass-panel p-6 rounded-2xl border border-border-subtle/40 flex flex-col justify-between h-32 relative overflow-hidden">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" className="w-24 h-3" />
      <Skeleton variant="circle" className="w-8 h-8" />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" className="w-16 h-7" />
      <Skeleton variant="text" className="w-32 h-2.5" />
    </div>
  </div>
)

export const ChartSkeleton = () => (
  <div className="glass-panel p-6 rounded-2xl border border-border-subtle/40 space-y-4 h-64 flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Skeleton variant="text" className="w-36 h-3" />
        <Skeleton variant="text" className="w-48 h-2.5" />
      </div>
      <Skeleton variant="text" className="w-16 h-4" />
    </div>
    <div className="flex items-end gap-2 h-36 pt-2">
      <Skeleton variant="rect" className="w-full h-[60%]" />
      <Skeleton variant="rect" className="w-full h-[85%]" />
      <Skeleton variant="rect" className="w-full h-[40%]" />
      <Skeleton variant="rect" className="w-full h-[70%]" />
      <Skeleton variant="rect" className="w-full h-[95%]" />
    </div>
  </div>
)

export const TableSkeleton = ({ rows = 4 }) => (
  <div className="glass-panel p-6 rounded-2xl border border-border-subtle/40 space-y-4">
    <div className="flex items-center justify-between pb-2">
      <Skeleton variant="text" className="w-28 h-3.5" />
      <div className="flex gap-2">
        <Skeleton variant="rect" className="w-24 h-8" />
        <Skeleton variant="rect" className="w-24 h-8" />
      </div>
    </div>
    <div className="space-y-3.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center justify-between py-1.5 border-b border-border-subtle/20">
          <Skeleton variant="text" className="w-1/3 h-3" />
          <Skeleton variant="text" className="w-1/6 h-3" />
          <Skeleton variant="text" className="w-1/12 h-3" />
          <Skeleton variant="text" className="w-1/4 h-3" />
        </div>
      ))}
    </div>
  </div>
)
