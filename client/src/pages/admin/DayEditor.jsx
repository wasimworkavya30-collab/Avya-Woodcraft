import { useState } from 'react';
import { Confirm } from '../../kit.jsx';
import { DAY_LABEL } from '../../data.js';
import { fmtDate } from '../../util.js';

export const unitsToDt = (u) => (u === 1 ? 'full' : u === 0.5 ? 'half' : u === 2 ? 'double' : 'custom');
export const CODE = { full: 'P', half: 'H', double: 'D', custom: 'C' };

/** Edits one employee-day: how many days it counts for and the approved hours. */
export default function DayEditor({ name, date, rec, onSave, onClear, onLeave, onClose, sundayOff, onSundayToggle }) {
  const [dt, setDt] = useState(rec ? unitsToDt(rec.units) : 'full');
  const [units, setUnits] = useState(rec ? rec.units : 1);
  const [hours, setHours] = useState(rec ? rec.hours : 8);
  const u = dt === 'full' ? 1 : dt === 'half' ? 0.5 : dt === 'double' ? 2 : Number(units);
  const pick = (v) => { setDt(v); setHours(v === 'half' ? 4 : v === 'double' ? 16 : v === 'full' ? 8 : Math.round(u * 8 * 4) / 4); };
  return (
    <div className="cellpanel card" role="dialog" aria-label={`Edit ${name} on ${fmtDate(date)}`}>
      <div className="head-row"><h3>{name} · {fmtDate(date)}</h3><button type="button" className="btn sm ghost" onClick={onClose}>Close</button></div>
      <div className="rowform">
        <label className="field"><span>Day counts as</span><select value={dt} onChange={(e) => pick(e.target.value)}>{Object.entries(DAY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        {dt === 'custom' && <label className="field"><span>Days (example 1.5)</span><input type="number" min="0.25" max="3" step="0.25" value={units} onChange={(e) => setUnits(e.target.value)} /></label>}
        <label className="field"><span>Hours</span><input type="number" min="0" max="24" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} /></label>
        <button type="button" className="btn primary" onClick={() => onSave({ days: u, hours: Number(hours) })}>Save day</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {rec && <Confirm label="Mark absent" confirmLabel="Yes, remove day" icon="trash" className="btn sm no" onYes={onClear} />}
        {onLeave && <button type="button" className="btn sm" onClick={onLeave}>Mark paid leave</button>}
        {onSundayToggle && <button type="button" className="btn sm" onClick={onSundayToggle}>{sundayOff ? 'Make this Sunday a working day' : 'Make this Sunday off'}</button>}
      </div>
    </div>
  );
}
