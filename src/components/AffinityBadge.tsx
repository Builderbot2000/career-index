import React from 'react'

export function AffinityBadge({
    score,
    skipped,
}: {
    score: number | null
    skipped: boolean
}): React.ReactElement {
    if (skipped) {
        return (
            <span
                style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    background: '#f3f4f6',
                    color: '#9ca3af',
                }}
                title="Affinity scoring skipped (below threshold)"
            >
                small batch
            </span>
        )
    }
    if (score === null) {
        return (
            <span
                style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    background: '#f3f4f6',
                    color: '#9ca3af',
                }}
                title="Not yet scored"
            >
                ?
            </span>
        )
    }
    const pct = Math.round(score * 100)
    const bg =
        pct >= 75 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : pct >= 25 ? '#ffedd5' : '#fee2e2'
    const fg =
        pct >= 75 ? '#166534' : pct >= 50 ? '#854d0e' : pct >= 25 ? '#9a3412' : '#991b1b'
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: bg,
                color: fg,
            }}
            title={`Affinity score: ${pct}%`}
        >
            {pct}%
        </span>
    )
}
