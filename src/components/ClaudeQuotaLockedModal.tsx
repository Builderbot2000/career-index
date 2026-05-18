import React from 'react'
import type { ClaudeQuotaLock, ClaudeQuotaReason } from '../shared/ipc-types'
import type { View } from '../App'

interface Props {
    lock: ClaudeQuotaLock
    onClose: () => void
    onNavigate: (view: View) => void
}

const COPY: Record<ClaudeQuotaReason, { headline: string; body: string }> = {
    rate_limit: {
        headline: 'Claude API rate limit exceeded',
        body: 'Wait a few minutes, then click Retry in Settings. Frequent rate limits may mean you need a higher Anthropic tier.',
    },
    credit_balance: {
        headline: 'Claude API credits exhausted',
        body: 'Add credits to your Anthropic account, then click Retry in Settings.',
    },
    overloaded: {
        headline: 'Claude API temporarily overloaded',
        body: 'Anthropic is under heavy load. Wait and then click Retry in Settings.',
    },
    auth: {
        headline: 'Claude API authentication failed',
        body: 'Your API key was rejected — update it in Settings, then click Retry.',
    },
}

export function ClaudeQuotaLockedModal({ lock, onClose, onNavigate }: Props): React.ReactElement {
    const copy = COPY[lock.reason]
    const occurred = new Date(lock.occurredAt).toLocaleString()

    return (
        <div
            data-testid="claude-quota-locked-modal"
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
                aria-labelledby="claude-quota-locked-modal-title"
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
                <h2
                    id="claude-quota-locked-modal-title"
                    style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}
                >
                    {copy.headline}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
                    Detected at {occurred} · code: <code>{lock.reason}</code>
                </p>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', marginBottom: 20 }}>
                    {copy.body}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
                    All Claude-powered features (resume tailoring, job affinity scoring, search term
                    generation, resume PDF import) are disabled until the lock is cleared.
                </p>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '7px 16px', cursor: 'pointer', fontSize: 13,
                            background: 'none', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', color: 'var(--text)',
                        }}
                    >
                        Close
                    </button>
                    <button
                        data-testid="claude-quota-locked-modal-settings"
                        onClick={() => onNavigate('settings')}
                        style={{
                            padding: '7px 16px', fontWeight: 600, cursor: 'pointer',
                            background: 'var(--accent)', border: 'none', color: '#000',
                            borderRadius: 'var(--radius)', fontSize: 13,
                        }}
                    >
                        Go to Settings
                    </button>
                </div>
            </div>
        </div>
    )
}
