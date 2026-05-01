import React, { useState, useRef, useCallback } from 'react'

export function LocationTagInput({
    values,
    onChange,
}: {
    values: string[]
    onChange: (tags: string[]) => void
}): React.ReactElement {
    const [inputValue, setInputValue] = useState('')
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const fetchSuggestions = useCallback((q: string) => {
        if (q.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return }
        window.api.suggestLocations(q.trim()).then((results) => {
            setSuggestions(results)
            setShowDropdown(results.length > 0)
        }).catch(() => { setSuggestions([]); setShowDropdown(false) })
    }, [])

    function handleInput(e: React.ChangeEvent<HTMLInputElement>): void {
        const val = e.target.value
        setInputValue(val)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
    }

    function addTag(tag: string): void {
        const trimmed = tag.trim()
        if (!trimmed || values.includes(trimmed)) return
        onChange([...values, trimmed])
        setInputValue('')
        setSuggestions([])
        setShowDropdown(false)
    }

    function removeTag(tag: string): void {
        onChange(values.filter((v) => v !== tag))
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
        if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
            e.preventDefault()
            addTag(inputValue)
        } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
            onChange(values.slice(0, -1))
        } else if (e.key === 'Escape') {
            setShowDropdown(false)
        }
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    padding: '4px 6px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    background: 'white',
                    minHeight: '32px',
                    alignItems: 'center',
                    cursor: 'text',
                }}
                onClick={() => containerRef.current?.querySelector('input')?.focus()}
            >
                {values.map((v) => (
                    <span
                        key={v}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '999px',
                            padding: '1px 8px',
                            fontSize: '0.75rem',
                        }}
                    >
                        {v}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(v) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1e40af', fontSize: '0.85rem', lineHeight: 1 }}
                        >×</button>
                    </span>
                ))}
                <input
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.trim().length >= 2 && setShowDropdown(suggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder={values.length === 0 ? 'e.g. San Francisco, CA' : ''}
                    style={{
                        border: 'none',
                        outline: 'none',
                        flex: 1,
                        minWidth: '120px',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        padding: 0,
                        background: 'transparent',
                    }}
                />
            </div>
            {showDropdown && suggestions.length > 0 && (
                <ul
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        margin: '2px 0 0',
                        padding: 0,
                        listStyle: 'none',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        maxHeight: '180px',
                        overflowY: 'auto',
                    }}
                >
                    {suggestions.map((s) => (
                        <li
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
                            style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '0.825rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                        >
                            {s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
