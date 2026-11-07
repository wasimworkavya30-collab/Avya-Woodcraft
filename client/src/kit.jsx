import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Icon, useToast, Modal, Avatar } from './ui.jsx';
import { squareJpeg, addDays, dd, sdate, todayInTz } from './util.js';
import { artSvg } from './data.js';

/** Lets pages refresh the sidebar counters after a change. */
export const CountsCtx = createContext(null);

/** `mutate('PATCH', path, body, 'Saved.')` calls the API, shows a toast and reloads the page data. */
export function useMutate(reload) {
  const toast = useToast();
  const counts = useContext(CountsCtx);
  return useCallback(
    async (method, path, body, msg) => {
      try {
        const r = await api(path, { method, body });
        if (msg) toast(msg);
        if (reload) await reload();
        counts?.refresh();
        return r ?? true;
      } catch (e) {
        toast(e.message, true);
        if (reload) reload();
        return null;
      }
    },
    [reload, toast, counts],
  );
}

/** Input that saves when you leave the field (or press Enter). */
export function Edit({ value, onCommit, type = 'text', className = '', ...rest }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  const commit = () => {
    if (String(v) === String(value ?? '')) return;
    onCommit(type === 'number' ? (v === '' ? null : Number(v)) : v);
  };
  return (
    <input
      type={type}
      className={className}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      {...rest}
    />
  );
}

export function PickEdit({ value, options, onCommit, ...rest }) {
  return (
    <select value={value ?? ''} onChange={(e) => onCommit(e.target.value)} {...rest}>
      {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  );
}

/** Two-step button: first click asks, second click does it. */
export function Confirm({ label, confirmLabel = 'Yes, delete', onYes, icon = 'trash', className = 'btn sm ghost no', iconOnly = false, ariaLabel }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!ask) return undefined;
    const t = setTimeout(() => setAsk(false), 5000);
    return () => clearTimeout(t);
  }, [ask]);
  if (ask)
    return (
      <span className="inl">
        <button type="button" className="btn sm no" onClick={() => { setAsk(false); onYes(); }}>{confirmLabel}</button>
        <button type="button" className="btn sm" onClick={() => setAsk(false)}>Cancel</button>
      </span>
    );
  return (
    <button type="button" className={className} aria-label={ariaLabel || label} onClick={() => setAsk(true)}>
      <Icon name={icon} size={13} />{!iconOnly && ` ${label}`}
    </button>
  );
}

/** "Photo" button that crops the chosen picture to a square and hands back a JPEG data URL. */
export function PhotoButton({ onPick, size = 160, label = 'Photo', iconOnly = false }) {
  const ref = useRef();
  const toast = useToast();
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            onPick(await squareJpeg(f, size));
          } catch (err) {
            toast(err.message, true);
          }
        }}
      />
      <button type="button" className="btn sm" aria-label={label} onClick={() => ref.current.click()}>
        <Icon name="cam" size={13} />{!iconOnly && ` ${label}`}
      </button>
    </>
  );
}

/** Picture of a material, product or job. Uses the uploaded photo or a drawn one. */
export function Thumb({ name, size = 44, src, kind }) {
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <svg viewBox="0 0 64 64" preserveAspectRatio="xMidYMid slice" role="img" aria-label={name} dangerouslySetInnerHTML={{ __html: artSvg(name, kind) }} />
      )}
    </span>
  );
}

export function Person({ name, photo, size = 36, ring = true, team, sub, onClick }) {
  const inner = (
    <>
      <Avatar name={name} src={photo} size={size} ring={ring} />
      <span><b>{name}</b>{sub && <><br /><small className="muted">{sub}</small></>}</span>
    </>
  );
  return onClick ? <button type="button" className="lnk" onClick={onClick}>{inner}</button> : <div className="lnk">{inner}</div>;
}

export function PageState({ q, children }) {
  if (q.loading && !q.data) return <div className="spin" role="status" aria-label="Loading" />;
  if (q.error)
    return (
      <div className="errbox" role="alert">
        {q.error.message}
        <button type="button" className="btn sm" style={{ marginLeft: 12 }} onClick={q.reload}>Try again</button>
      </div>
    );
  return children;
}

export function AuthImage({ path, alt, className }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let u;
    let off = false;
    api(path, { blob: true })
      .then((b) => { if (!off) { u = URL.createObjectURL(b); setUrl(u); } })
      .catch(() => !off && setErr(true));
    return () => { off = true; if (u) URL.revokeObjectURL(u); };
  }, [path]);
  if (err) return <p className="muted">Could not load the photo.</p>;
  return url ? <img className={className} src={url} alt={alt} style={{ maxWidth: '100%', borderRadius: 12 }} /> : <div className="spin" />;
}

export function SelfieModal({ id, onClose }) {
  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 10 }}>Punch photos</h3>
      <div className="two">
        <div><span className="cap">Check-in</span><AuthImage path={`/api/admin/attendance/${id}/selfie/in`} alt="Check-in selfie" /></div>
        <div><span className="cap">Check-out</span><AuthImage path={`/api/admin/attendance/${id}/selfie/out`} alt="Check-out selfie" /></div>
      </div>
      <div style={{ marginTop: 14, textAlign: 'right' }}><button type="button" className="btn" onClick={onClose}>Close</button></div>
    </Modal>
  );
}

/** Timeline bars. rows: [{label,pS,pE,aS,aE,state,fS,fE}] (dates are YYYY-MM-DD). */
export function Gantt({ rows, lo, hi }) {
  const N = Math.max(1, dd(lo, hi));
  const T = todayInTz();
  const pc = (d) => Math.max(0, Math.min(100, (dd(lo, d) / N) * 100));
  const step = Math.max(1, Math.ceil(N / 8));
  const ticks = [];
  for (let i = 0; i <= N; i += step) ticks.push(i);
  const bar = (cls, a, b) => (a && b ? <i className={cls} style={{ left: `${pc(a)}%`, width: `${Math.max(0.8, pc(b) - pc(a))}%` }} /> : null);
  return (
    <>
      <div className="scroll">
        <div className="gantt">
          <div className="gax">{ticks.map((i) => <span key={i} style={{ left: `${(i / N) * 100}%` }}>{sdate(addDays(lo, i))}</span>)}</div>
          {rows.map((r) => (
            <div className="gr" key={r.key || r.label}>
              <div className="gl">{r.label}</div>
              <div className="gt">
                {bar('gp', r.pS, r.pE)}
                {bar(`ga ${r.state || ''}`, r.aS, r.aE)}
                {bar('gf', r.fS, r.fE)}
                {T >= lo && T <= hi && <i className="gtoday" style={{ left: `${pc(T)}%` }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="legend">
        <span><i className="sw" style={{ background: 'color-mix(in srgb,var(--accent) 35%,transparent)' }} />Planned</span>
        <span><i className="sw" style={{ background: 'var(--accent)' }} />Actual so far</span>
        <span><i className="sw" style={{ background: 'var(--good)' }} />Done on time</span>
        <span><i className="sw" style={{ background: 'var(--bad)' }} />Late</span>
        <span><i className="sw" style={{ background: 'repeating-linear-gradient(45deg,var(--bad) 0 3px,transparent 3px 6px)' }} />Expected extra time</span>
        <span><i className="sw" style={{ background: 'var(--bad)', width: 3 }} />Today</span>
      </div>
    </>
  );
}
