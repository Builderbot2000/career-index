import React, { useEffect } from 'react'
import type { JobPosting } from '../shared/ipc-types'

interface Props {
  posting: JobPosting | null
  onConfirm: () => void
  onDecline: () => void
  onClose: () => void
}

export function ApplyConfirmModal({ posting, onConfirm, onDecline, onClose }: Props): React.ReactElement | null {
  useEffect(() => {
    if (!posting) return
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [posting, onClose])

  if (!posting) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-confirm-title"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '28px 32px',
          maxWidth: 440,
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="apply-confirm-title"
          style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}
        >
          Did you apply to this job?
        </h2>

        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', margin: '0 0 8px' }}>
          <strong>{posting.title}</strong>
        </p>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 24px' }}>
          {posting.company}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            data-testid="apply-confirm-no"
            onClick={onDecline}
            style={{
              fontSize: 13, padding: '6px 16px',
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            No, not yet
          </button>
          <button
            data-testid="apply-confirm-yes"
            onClick={onConfirm}
            style={{
              fontSize: 13, padding: '6px 16px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Yes, I applied
          </button>
        </div>
      </div>
    </div>
  )
}
