import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { initials, avatarColor, ml, shiftMonth } from './util.js';

const ICONS = {
 home:'<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.8a3.5 3.5 0 010 6.4M18 14.4c2.2.7 3.5 2.6 3.5 5.6"/>',
 team:'<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 8v4M12 12H5v4M12 12h7v4"/>',
 cal:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2L19 19M5 19l1.8-1.8M17.2 6.8L19 5"/>',
 wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
 box:'<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5L12 12l9-4.5M12 12v9"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
 file:'<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>',
 rupee:'<path d="M7 5h10M7 9h10M7 5c5 0 6 2.5 6 4s-1 4-6 4l7 6"/>',
 phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
 out:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
 cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 work:'<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3"/>',
 clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 pin:'<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
 undo:'<path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"/>',
 gantt:'<path d="M4 6h9M8 12h12M4 18h8"/>',
 db:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
 adv:'<path d="M12 3v18M17 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19 12l2-1.5-2-3.5-2.4.8a7 7 0 00-1.6-1L14.5 4h-4l-.5 2.8a7 7 0 00-1.6 1L6 7 4 10.5 6 12l-2 1.5 2 3.5 2.4-.8a7 7 0 001.6 1l.5 2.8h4l.5-2.8a7 7 0 001.6-1l2.4.8 2-3.5z"/>',
 download:'<path d="M12 4v10M7 10l5 5 5-5M5 20h14"/>'
};
export function Icon({ name, size = 18 }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] || ICONS.file }} />
  );
}

export function Avatar({ name = '?', src, size = 38, ring = false }) {
  const st = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) return <img className={`av${ring ? ' ring' : ''}`} style={st} src={src} alt={name} />;
  return (
    <span className={`av${ring ? ' ring' : ''}`} style={{ ...st, background: avatarColor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export const Chip = ({ kind = '', children }) => <span className={`chip ${kind}`}>{children}</span>;

export function Tile({ icon, label, value, tone = 'var(--accent)', alert = false }) {
  return (
    <div className={`tile${alert ? ' alert' : ''}`} style={{ '--tc': tone }}>
      <span className="ti"><Icon name={icon} size={19} /></span>
      <span className="cap">{label}</span>
      <b className="num">{value}</b>
    </div>
  );
}

export function MonthNav({ month, onChange, max }) {
  return (
    <div className="mnav" role="group" aria-label="Month">
      <button type="button" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>‹</button>
      <span>{ml(month)}</span>
      <button type="button" aria-label="Next month" disabled={month >= max} onClick={() => onChange(shiftMonth(month, 1))}>›</button>
    </div>
  );
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export const Spinner = () => <div className="spin" role="status" aria-label="Loading" />;
export const ErrorBox = ({ error, onRetry }) => (
  <div className="errbox" role="alert">
    {error?.message || 'Something went wrong.'}
    {onRetry && <button type="button" className="btn sm" style={{ marginLeft: 12 }} onClick={onRetry}>Try again</button>}
  </div>
);

/** Run an async loader and keep its state. `reload()` runs it again. */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const seq = useRef(0);
  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then((data) => id === seq.current && setState({ loading: false, data, error: null }))
      .catch((error) => id === seq.current && setState({ loading: false, data: null, error }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, err = false) => {
    setT({ msg, err });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div id="toast" className={t ? `show${t.err ? ' err' : ''}` : ''} role="status" aria-live="polite">{t?.msg}</div>
    </ToastCtx.Provider>
  );
}

export function Modal({ onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="box" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
