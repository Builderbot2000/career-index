import React from 'react'
import type { ProfileEntryType } from '../../shared/ipc-types'
import { ENTRY_TYPES, TYPE_LABELS, countWords } from './constants'
import type { FormState } from './constants'

interface EntryFormProps {
    form: FormState
    formError: string | null
    busy: boolean
    editingId: string | null
    onSave: () => void
    onCancel: () => void
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}

export function EntryForm({
    form,
    formError,
    busy,
    editingId,
    onSave,
    onCancel,
    setField,
}: EntryFormProps): React.ReactElement {
    const wordCount = countWords(form.content)

    return (
        <div data-testid="profile-form">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button className="btn" onClick={onCancel}>← Back</button>
                <h1 style={{ margin: 0 }}>{editingId ? 'Edit Entry' : 'New Entry'}</h1>
            </div>

            <div className="card">
                <div className="form-row">
                    <label htmlFor="profile-form-type">Type</label>
                    <select
                        id="profile-form-type"
                        data-testid="profile-form-type"
                        value={form.type}
                        onChange={(e) => setField('type', e.target.value as ProfileEntryType)}
                    >
                        {ENTRY_TYPES.map((t) => (
                            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                    </select>
                </div>

                <div className="form-row">
                    <label htmlFor="profile-form-title">Title</label>
                    <input
                        id="profile-form-title"
                        data-testid="profile-form-title"
                        type="text"
                        value={form.title}
                        placeholder="e.g. Senior Software Engineer at Acme Corp"
                        onChange={(e) => setField('title', e.target.value)}
                    />
                </div>

                <div className="form-row">
                    <label htmlFor="profile-form-content">Content</label>
                    <textarea
                        id="profile-form-content"
                        data-testid="profile-form-content"
                        value={form.content}
                        rows={8}
                        placeholder="Describe this entry…"
                        onChange={(e) => setField('content', e.target.value)}
                        style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div data-testid="profile-word-count" className="form-hint">{wordCount} word{wordCount !== 1 ? 's' : ''}</div>
                </div>

                <div className="form-row">
                    <label htmlFor="profile-form-tags">Tags</label>
                    <input
                        id="profile-form-tags"
                        data-testid="profile-form-tags"
                        type="text"
                        value={form.tagsRaw}
                        placeholder="typescript, node.js, leadership"
                        onChange={(e) => setField('tagsRaw', e.target.value)}
                    />
                    <div className="form-hint">Comma-separated</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-row">
                        <label>Start date</label>
                        <input
                            type="date"
                            value={form.start_date}
                            onChange={(e) => setField('start_date', e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label>End date</label>
                        <input
                            type="date"
                            value={form.end_date}
                            onChange={(e) => setField('end_date', e.target.value)}
                        />
                        <div className="form-hint">Leave blank if current / ongoing</div>
                    </div>
                </div>

                {formError && (
                    <div data-testid="profile-form-error" style={{ marginTop: 8, fontSize: 13, color: '#dc2626' }}>{formError}</div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <button data-testid="profile-form-save" className="btn btn-primary" onClick={onSave} disabled={busy}>
                        {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add entry'}
                    </button>
                    <button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
