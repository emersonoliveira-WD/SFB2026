import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
  disabled?: boolean;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value, onChange, options, placeholder, disabled = false, id,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(v => !v);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef} className={`ss-wrap ${disabled ? 'ss-disabled' : ''}`} id={id}>
      <button type="button" className="ss-trigger" onClick={handleOpen} disabled={disabled}>
        <span className={selectedLabel ? 'ss-value' : 'ss-placeholder'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={15} className={`ss-arrow ${open ? 'ss-arrow-open' : ''}`} />
      </button>
      {open && (
        <div className="ss-dropdown">
          <div className="ss-search">
            <Search size={14} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Filtrar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <ul className="ss-list">
            {value && (
              <li className="ss-item ss-clear" onClick={() => select('')}>
                <X size={12} /> Limpar seleção
              </li>
            )}
            {filtered.length === 0
              ? <li className="ss-item ss-empty">Nenhum resultado</li>
              : filtered.map(o => (
                <li
                  key={o.value}
                  className={`ss-item ${o.value === value ? 'ss-selected' : ''}`}
                  onClick={() => select(o.value)}
                >
                  {o.value === value && <Check size={12} />}
                  {o.label}
                </li>
              ))
            }
          </ul>
        </div>
      )}
    </div>
  );
};
