import React from 'react'

export function ConditionChip({
    label,
    color = '#f3f4f6',
}: {
    label: string | undefined
    color?: string
}): React.ReactElement | null {
    if (!label) return null
    return (
        <span
            style={{
                fontSize: '0.68rem',
                color: '#374151',
                background: color,
                padding: '1px 6px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </span>
    )
}
