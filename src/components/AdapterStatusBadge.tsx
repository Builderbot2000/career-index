import React from 'react'
import type { AdapterProgress } from '../shared/ipc-types'

export function AdapterStatusBadge({
    progress,
    available,
}: {
    progress?: AdapterProgress
    available: boolean
}): React.ReactElement | null {
    if (!available) {
        return <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>Unavailable</span>
    }
    if (!progress) return null
    if (progress.status === 'running') {
        return (
            <span style={{ fontSize: '0.75rem', color: '#4dabf7', whiteSpace: 'nowrap' }}>
                {progress.fetched != null && progress.fetched > 0
                    ? `Running… (${progress.fetched})`
                    : 'Running…'}
            </span>
        )
    }
    if (progress.status === 'done') {
        return (
            <span style={{ fontSize: '0.75rem', color: '#16a34a', whiteSpace: 'nowrap' }}>
                ✓ {progress.fetched} fetched
            </span>
        )
    }
    if (progress.status === 'error') {
        return (
            <span
                style={{
                    fontSize: '0.75rem',
                    color: '#fa5252',
                    whiteSpace: 'nowrap',
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'inline-block',
                }}
                title={progress.error}
            >
                ✗ Error
            </span>
        )
    }
    return null
}
