import React from 'react'

export function Pagination({
    page,
    totalPages,
    onPage,
}: {
    page: number
    totalPages: number
    onPage: (p: number) => void
}): React.ReactElement | null {
    if (totalPages <= 1) return null
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    return (
        <div style={{ display: 'flex', gap: '4px', marginTop: '16px', alignItems: 'center' }}>
            <button
                disabled={page === 1}
                onClick={() => onPage(page - 1)}
                style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
                ‹
            </button>
            {pages.map((p) => (
                <button
                    key={p}
                    onClick={() => onPage(p)}
                    style={{
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: p === page ? 700 : 400,
                        background: p === page ? '#2563eb' : undefined,
                        color: p === page ? 'white' : undefined,
                        border: p === page ? '1px solid #2563eb' : '1px solid #d1d5db',
                        borderRadius: '4px',
                    }}
                >
                    {p}
                </button>
            ))}
            <button
                disabled={page === totalPages}
                onClick={() => onPage(page + 1)}
                style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
                ›
            </button>
        </div>
    )
}
