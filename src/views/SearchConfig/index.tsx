import React, { useState } from 'react'
import { IntentTab } from './IntentTab'
import { FiltersTab } from './FiltersTab'
import { BanListTab } from './BanListTab'
import type { ScrapeProps } from './IntentTab'

export type { ScrapeProps }

type Tab = 'intent' | 'filters' | 'banlist'

export default function SearchConfig(props: ScrapeProps): React.ReactElement {
    const [tab, setTab] = useState<Tab>('intent')

    const tabStyle = (t: Tab): React.CSSProperties => ({
        padding: '8px 20px',
        cursor: 'pointer',
        fontWeight: tab === t ? 700 : 400,
        background: 'none',
        border: 'none',
        borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
        color: tab === t ? '#2563eb' : '#374151',
        fontSize: '0.9rem',
    })

    return (
        <div style={{ padding: '24px', maxWidth: '700px' }}>
            <h2 style={{ marginTop: 0 }}>Search Configuration</h2>

            <div
                style={{
                    display: 'flex',
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: '24px',
                }}
            >
                <button style={tabStyle('intent')} onClick={() => setTab('intent')}>
                    Intent &amp; Terms
                </button>
                <button style={tabStyle('filters')} onClick={() => setTab('filters')}>
                    Filters
                </button>
                <button style={tabStyle('banlist')} onClick={() => setTab('banlist')}>
                    Ban List
                </button>
            </div>

            {tab === 'intent' && <IntentTab {...props} />}
            {tab === 'filters' && <FiltersTab />}
            {tab === 'banlist' && <BanListTab />}
        </div>
    )
}
