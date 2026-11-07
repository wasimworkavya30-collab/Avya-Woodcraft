import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Tile, Chip } from '../../ui.jsx';
import { PageState, Person, useMutate, Edit, Confirm } from '../../kit.jsx';
import { fmtDate, fmtTime, hrs, num } from '../../util.js';

export default function WorkLog() {
  const [date, setDate] = useState('');
  const [emp, setEmp] = useState('all');
  const q = useAsync(() => api(`/api/admin/work${date ? `?date=${date}` : ''}`), [date]);
  const mutate = useMutate(q.reload);
  const d = q.data;
  return (
    <PageState q={q}>
      {d && (() => {
        const people = d.people.filter((p) => emp === 'all' || String(p.employeeId) === emp);
        const total = d.entries.reduce((a, w) => a + w.hours, 0);
        const by = {};
        d.entries.forEach((w) => { by[w.task] = (by[w.task] || 0) + w.hours; });
        const keys = Object.keys(by).sort((a, b) => by[b] - by[a]);
        const mx = Math.max(1, ...keys.map((k) => by[k]));
        const logged = d.people.filter((p) => d.entries.some((w) => w.employeeId === p.employeeId)).length;
        return (
          <div className="stack">
            <div className="two" style={{ maxWidth: 520 }}>
              <label className="field" style={{ margin: 0 }}><span>Date</span>
                <select value={d.date} onChange={(e) => setDate(e.target.value)}>
                  {d.dates.map((x) => <option key={x} value={x}>{fmtDate(x)}{x === d.today ? ' (today)' : ''}</option>)}
                </select>
              </label>
              <label className="field" style={{ margin: 0 }}><span>Employee</span>
                <select value={emp} onChange={(e) => setEmp(e.target.value)}>
                  <option value="all">All employees</option>
                  {d.people.map((p) => <option key={p.employeeId} value={p.employeeId}>{p.name}</option>)}
                </select>
              </label>
            </div>
            <div className="tiles">
              <Tile icon="clock" label="Hours logged" value={total.toFixed(2)} tone="var(--primary)" />
              <Tile icon="users" label="Employees logged" value={logged} tone="var(--good)" />
              <Tile icon="clip" label="Present, no log" value={d.people.length - logged} tone="var(--warn)" />
            </div>
            <div className="cols">
              <div className="stack">
                {people.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Nothing to show for this day.</p></div>}
                {people.map((p) => {
                  const es = d.entries.filter((w) => w.employeeId === p.employeeId);
                  const w = es.reduce((a, x) => a + x.hours, 0);
                  const chip = !es.length ? <Chip kind="warn">No work logged</Chip> : p.attHours != null && Math.abs(w - p.attHours) > 1 ? <Chip kind="warn">Logged {hrs(w)} of {hrs(p.attHours)}</Chip> : <Chip kind="good">{hrs(w)} logged</Chip>;
                  return (
                    <div className="card" key={p.employeeId}>
                      <div className="logrow" style={{ paddingTop: 0 }}>
                        <Person name={p.name} photo={p.photo} size={40} sub={`${p.role}${p.inAt ? ` · in ${fmtTime(p.inAt)}` : ''}${p.outAt ? `, out ${fmtTime(p.outAt)}` : ''}`} />
                        <span className="grow" />{chip}
                      </div>
                      {es.length ? es.map((x) => (
                        <div className="logrow" key={x.id}>
                          <div className="grow"><b>{x.task}</b><br /><span className="small muted">{x.item}{x.note ? ` · ${x.note}` : ''}</span></div>
                          <Edit className="sm" type="number" min="0.25" max="12" step="0.25" value={x.hours} aria-label="Hours" onCommit={(v) => mutate('PATCH', `/api/admin/work/${x.id}`, { hours: v }, 'Saved.')} />
                          <Confirm iconOnly label="Delete" ariaLabel="Delete entry" onYes={() => mutate('DELETE', `/api/admin/work/${x.id}`, undefined, 'Entry deleted.')} />
                        </div>
                      )) : <p className="small muted" style={{ margin: '8px 0 0' }}>This employee was present but did not add any work.</p>}
                    </div>
                  );
                })}
              </div>
              <div className="card">
                <h3 style={{ marginBottom: 12 }}>Hours by kind of work</h3>
                {keys.length ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {keys.map((k) => (
                      <div key={k}><div className="head-row" style={{ margin: 0 }}><span>{k}</span><span className="mono">{num(by[k])}</span></div><div className="bar" style={{ width: `${Math.round((by[k] / mx) * 100)}%` }} /></div>
                    ))}
                  </div>
                ) : <p className="muted" style={{ margin: 0 }}>No work logged on this day.</p>}
              </div>
            </div>
          </div>
        );
      })()}
    </PageState>
  );
}
