import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Chip } from '../../ui.jsx';
import { PageState, Person, useMutate, SelfieModal } from '../../kit.jsx';
import { fmtDate, fmtTime, hrs } from '../../util.js';
import { DAY_LABEL } from '../../data.js';

export default function Approvals() {
  const q = useAsync(() => api('/api/admin/attendance/pending'), []);
  const mutate = useMutate(q.reload);
  const [edit, setEdit] = useState({});
  const [selfie, setSelfie] = useState(null);
  const rows = q.data?.rows || [];
  const val = (r, k, d) => (edit[r.id]?.[k] !== undefined ? edit[r.id][k] : d);
  const set = (r, k, v) => setEdit((e) => ({ ...e, [r.id]: { ...e[r.id], [k]: v } }));

  return (
    <PageState q={q}>
      <div className="card">
        <div className="head-row">
          <div><h3>Waiting for approval</h3><span className="small muted">Set the day type (full, half, double shift or a custom count) and hours, then approve. Only approved hours count towards salary.</span></div>
          {rows.length > 0 && <button type="button" className="btn primary sm" onClick={() => mutate('POST', '/api/admin/attendance/approve-all', {}, 'All approved.')}>Approve all ({rows.length})</button>}
        </div>
        {rows.length === 0 && <p className="muted" style={{ margin: '6px 0 0' }}>Everything is approved.</p>}
        {rows.map((r) => {
          const dt = val(r, 'dayType', r.dayType);
          return (
            <div className="pend" key={r.id}>
              <Person name={r.name} photo={r.photo} size={40} sub={<>{fmtDate(r.date)} · <span className="mono">{fmtTime(r.checkInAt)} → {fmtTime(r.checkOutAt)}</span> · {r.distance} m<br />Work logged: <b className="mono">{hrs(r.workHours)}</b></>} />
              <span className="grow" />
              <button type="button" className="btn sm ghost" onClick={() => setSelfie(r.id)}>Photos</button>
              <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Day
                <select value={dt} onChange={(e) => set(r, 'dayType', e.target.value)} aria-label={`Day type for ${r.name}`}>
                  {Object.entries(DAY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              {dt === 'custom' && (
                <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Days
                  <input type="number" min="0.25" max="3" step="0.25" value={val(r, 'units', r.units || 1.5)} onChange={(e) => set(r, 'units', e.target.value)} aria-label="Days counted" />
                </label>
              )}
              <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Hours
                <input type="number" min="0" max="16" step="0.25" value={val(r, 'hours', r.suggestedHours)} onChange={(e) => set(r, 'hours', e.target.value)} aria-label={`Approved hours for ${r.name}`} />
              </label>
              <button type="button" className="btn sm ok" onClick={() => mutate('PATCH', `/api/admin/attendance/${r.id}/approve`, { hours: Number(val(r, 'hours', r.suggestedHours)), dayType: dt, units: dt === 'custom' ? Number(val(r, 'units', r.units || 1.5)) : undefined }, 'Hours approved.')}>Approve</button>
              <button type="button" className="btn sm no" onClick={() => mutate('PATCH', `/api/admin/attendance/${r.id}/reject`, {}, 'Rejected.')}>Reject</button>
            </div>
          );
        })}
      </div>
      {selfie && <SelfieModal id={selfie} onClose={() => setSelfie(null)} />}
    </PageState>
  );
}
