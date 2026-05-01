import React, { useState, useEffect } from 'react'
import type { BanListEntry } from '../../shared/ipc-types'

export function BanListTab(): React.ReactElement {
    const [banList, setBanList] = useState<BanListEntry[]>([])
    const [companyValue, setCompanyValue] = useState('')
    const [domainValue, setDomainValue] = useState('')
    const [companyPreview, setCompanyPreview] = useState<number | null>(null)
    const [domainPreview, setDomainPreview] = useState<number | null>(null)
    const [adding, setAdding] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        window.api.getBanList().then(setBanList)
    }, [])

    // Auto-preview company bans with debounce
    useEffect(() => {
        if (!companyValue.trim()) { setCompanyPreview(null); return }
        const timer = setTimeout(async () => {
            const count = await window.api.previewBanMatch('company', companyValue.trim())
            setCompanyPreview(count)
        }, 400)
        return () => clearTimeout(timer)
    }, [companyValue])

    // Auto-preview domain bans with debounce
    useEffect(() => {
        if (!domainValue.trim()) { setDomainPreview(null); return }
        const timer = setTimeout(async () => {
            const count = await window.api.previewBanMatch('domain', domainValue.trim())
            setDomainPreview(count)
        }, 400)
        return () => clearTimeout(timer)
    }, [domainValue])

    async function handleAdd(): Promise<void> {
        // Submit company ban if filled; otherwise domain ban
        const type: 'company' | 'domain' = companyValue.trim() ? 'company' : 'domain'
        const val = type === 'company' ? companyValue : domainValue
        if (!val.trim()) return
        setAdding(true)
        setError(null)
        try {
            const { entry, deletedCount } = await window.api.addBanEntry({ type, value: val.trim() })
            setBanList((prev) => [entry, ...prev])
            if (type === 'company') { setCompanyValue(''); setCompanyPreview(null) }
            else { setDomainValue(''); setDomainPreview(null) } if (deletedCount > 0) {
                setError(`✓ Added. ${deletedCount} matching posting(s) deleted from board.`)
                setTimeout(() => setError(null), 4000)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setAdding(false)
        }
    }

    async function handleRemove(id: string): Promise<void> {
        await window.api.removeBanEntry(id)
        setBanList((prev) => prev.filter((b) => b.id !== id))
    }

    const inputStyle: React.CSSProperties = {
        flex: 1,
        padding: '6px 8px',
        fontSize: '0.875rem',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        fontFamily: 'inherit',
    }
    const labelStyle: React.CSSProperties = {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#374151',
        minWidth: '60px',
    }

    return (
        <div>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 0 }}>
                Ban list entries permanently exclude companies or domains. Existing matching postings are
                deleted immediately when you add an entry.
            </p>

            {/* Add form */}
            <div
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    background: '#f9fafb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}
            >
                {/* Company row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label htmlFor="ban-company" style={labelStyle}>Company</label>
                    <input
                        id="ban-company"
                        value={companyValue}
                        onChange={(e) => setCompanyValue(e.target.value)}
                        placeholder="Company name pattern (e.g. Megacorp|BigTech)"
                        style={inputStyle}
                    />
                    {companyPreview !== null && (
                        <span style={{ fontSize: '0.8rem', color: companyPreview > 0 ? '#b91c1c' : '#16a34a', whiteSpace: 'nowrap' }}>
                            {companyPreview > 0 ? `${companyPreview} posting(s) will be deleted` : 'No matches'}
                        </span>
                    )}
                </div>

                {/* Domain row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label htmlFor="ban-domain" style={labelStyle}>Domain</label>
                    <input
                        id="ban-domain"
                        value={domainValue}
                        onChange={(e) => setDomainValue(e.target.value)}
                        placeholder="Domain to ban (e.g. megacorp.com)"
                        style={inputStyle}
                    />
                    {domainPreview !== null && (
                        <span style={{ fontSize: '0.8rem', color: domainPreview > 0 ? '#b91c1c' : '#16a34a', whiteSpace: 'nowrap' }}>
                            {domainPreview > 0 ? `${domainPreview} posting(s) will be deleted` : 'No matches'}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleAdd}
                        disabled={adding || (!companyValue.trim() && !domainValue.trim())}
                        style={{ padding: '6px 16px', fontWeight: 600, cursor: 'pointer', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        {adding ? 'Adding…' : 'Add ban'}
                    </button>
                </div>

                {error && (
                    <div style={{ fontSize: '0.85rem', color: error.startsWith('✓') ? '#166534' : 'crimson' }}>
                        {error}
                    </div>
                )}
            </div>

            {/* Existing entries */}
            {banList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>No ban list entries yet.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {banList.map((entry) => (
                        <li
                            key={entry.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px 0',
                                borderBottom: '1px solid #f3f4f6',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '0.7rem',
                                    background: entry.type === 'domain' ? '#dbeafe' : '#fce7f3',
                                    color: entry.type === 'domain' ? '#1d4ed8' : '#9d174d',
                                    padding: '2px 6px',
                                    borderRadius: '999px',
                                    whiteSpace: 'nowrap',
                                    marginTop: '2px',
                                }}
                            >
                                {entry.type}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{entry.value}</div>
                                {entry.reason && (
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{entry.reason}</div>
                                )}
                            </div>
                            <button
                                onClick={() => handleRemove(entry.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0 4px',
                                    fontSize: '1rem',
                                }}
                                title="Remove"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
