import React from 'react'
import type { JobPosting } from '../shared/ipc-types'
import { AffinityBadge } from './AffinityBadge'

interface Props {
  posting: JobPosting
  onClose: () => void
}

export function AffinityReasonModal({ posting, onClose }: Props): React.ReactElement {
  const niceLabel = posting.nice_to_haves_class
    ? posting.nice_to_haves_class.replace(/_/g, ' ')
    : null
  const scorePct = posting.affinity_score !== null
    ? `${Math.round(posting.affinity_score * 100)}%`
    : null

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
        aria-labelledby="affinity-modal-title"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '28px 32px',
          maxWidth: 480,
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2
            id="affinity-modal-title"
            style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}
          >
            Fit Assessment
          </h2>
          <AffinityBadge
            score={posting.affinity_score}
            hardReqsClass={posting.hard_reqs_class}
            niceToHavesClass={posting.nice_to_haves_class}
          />
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', margin: '0 0 20px' }}>
          {posting.affinity_reasoning ?? 'No reasoning available.'}
        </p>

        <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {posting.hard_reqs_class && (
            <span>Hard reqs: <strong>{posting.hard_reqs_class.replace(/_/g, ' ')}</strong></span>
          )}
          {niceLabel && (
            <span>Nice-to-haves: <strong>{niceLabel}</strong></span>
          )}
          {scorePct && (
            <span>Score: <strong>{scorePct}</strong></span>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            fontSize: 13, padding: '6px 16px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius)',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
