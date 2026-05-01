import React from 'react'
import type { JobPosting } from '../shared/ipc-types'

export function StatusBadge({ status }: { status: JobPosting['status'] }): React.ReactElement {
    const colors: Record<string, string> = {
        new: '#3b82f6',
        viewed: '#6b7280',
        favorited: '#f59e0b',
        applied: '#8b5cf6',
        interviewing: '#0891b2',
        offer: '#16a34a',
        rejected: '#dc2626',
        ghosted: '#9ca3af',
    }
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#fff',
                background: colors[status] ?? '#6b7280',
                textTransform: 'capitalize',
            }}
        >
            {status}
        </span>
    )
}
