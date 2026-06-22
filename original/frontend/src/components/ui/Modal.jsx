import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
}) => {
  // Handle keyboard escape press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
      />
      
      {/* Dialog container */}
      <div 
        className={`
          relative w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl border border-border-subtle z-10
          animate-slide-up flex flex-col gap-4 bg-gradient-to-br from-bg-surface to-bg-panel
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-text-primary tracking-tight font-sans">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-panel text-text-muted hover:text-text-primary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="text-xs text-text-secondary leading-relaxed font-light py-2">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Pre-built Confirmation Modal layout helper
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}
