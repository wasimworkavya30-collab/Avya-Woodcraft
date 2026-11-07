import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, MonthNav, Tile, Chip } from '../../ui.jsx';
import { PageState, Person, useMutate, Edit } from '../../kit.jsx';
import DayEditor, { CODE } from './DayEditor.jsx';
import { useRouter } from '../../router.jsx';
import { currentMonth, daysIn, fmtDate, inr, ml, num, pad } from '../../util.js';

export default function EmployeeFile({ id }) {
  const [month, setMonth] = useState(currentMonth());
  const q = useAsync(() => api(`/api/admin/employees/${id}/month?month=${month}`), [id, month]);
  const mutate = useMutate(q.reload);
  const { navigate } = useRouter();
  const [date, setDate] = useState(null);
  const d = q.data;
  const days = Array.from({ length: daysIn(month) }, (_, i) => `${month}-${pad(i + 1)}`);
  return (
    <PageState q={q}>
      {d && (
        <div className="stack">
          <div className="toolbar">
            <button type="button" className="btn sm" onClick={() => navigate('/admin/employees')}>← All employees</button>
            <MonthNav month={month} onChange={(m) => { setMonth(m); setDate(null); }} max={currentMonth()} />
          </div>
          <div className="card">
            <Person name={d.employee.name} photo={d.employee.photo} size={64} sub={`${d.employee.role} · ${d.employee.code} · ${inr(d.employee.hourlyRate)}/hour`} />
          </div>
          <div className="tiles">
            <Tile icon="cal" label={`Days · ${ml(month)}`} value={num(d.totals.units)} tone="var(--primary)" />
            <Tile icon="clock" label="Approved hours" value={num(d.totals.approvedHours)} tone="var(--accent)" />
            <Tile icon="rupee" label="Gross" value={inr(d.totals.gross)} tone="var(--good)" />
            <Tile icon="adv" label="Advance deducted" value={inr(d.totals.deduction)} tone="var(--warn)" />
            <Tile icon="check" label="Net pay" value={inr(d.totals.net)} tone="var(--good)" />
          </div>
          <div className="cols">
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>Attendance, day by day</h3>
              <div className="scroll"><table>
                <thead><tr><th>Date</th><th>Day</th><th className="r">Hours</th><th /></tr></thead>
                <tbody>
                  {days.map((x) => {
                    const r = d.days[x];
                    return (
                      <tr key={x}>
                        <td>{fmtDate(x)}</td>
                        <td>{r ? <Chip kind="good">{CODE[r.dayType] || 'C'}{r.units !== 1 ? ` · ${r.units}` : ''}</Chip> : <span className="muted">–</span>}</td>
                        <td className="r mono">{r ? num(r.hours) : ''}</td>
                        <td className="r"><button type="button" className="btn sm" onClick={() => setDate(x)}>{r ? 'Edit' : 'Add'}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            </div>
            <div className="stack">
              <div className="card">
                <h3 style={{ marginBottom: 8 }}>Advances</h3>
                <p style={{ margin: '0 0 8px' }}>Still to recover: <b className={`mono ${d.outstanding > 0 ? 'neg' : ''}`}>{inr(d.outstanding)}</b></p>
                {d.advances.map((a) => <div className="logrow" key={a.id}><div className="grow">{fmtDate(a.date)}<br /><span className="small muted">{a.note}</span></div><span className="mono">{inr(a.amount)}</span></div>)}
                {!d.advances.length && <p className="muted small">No advances.</p>}
                <label className="field" style={{ marginTop: 10 }}><span>Deduct from {ml(month)} ₹</span>
                  <Edit type="number" min="0" step="100" value={d.totals.deduction} onCommit={(v) => v >= 0 && mutate('PUT', '/api/admin/advances/deduction', { employeeId: Number(id), month, amount: v }, 'Deduction saved.')} />
                </label>
              </div>
            </div>
          </div>
          {date && <DayEditor key={date} name={d.employee.name} date={date} rec={d.days[date]}
            onSave={async (b) => { if (await mutate('PUT', '/api/admin/attendance/day', { employeeId: Number(id), date, ...b }, 'Day saved.')) setDate(null); }}
            onClear={async () => { if (await mutate('PUT', '/api/admin/attendance/day', { employeeId: Number(id), date, days: 0, hours: 0 }, 'Day removed.')) setDate(null); }}
            onClose={() => setDate(null)} />}
        </div>
      )}
    </PageState>
  );
}
