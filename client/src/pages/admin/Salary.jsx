import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, MonthNav, Tile } from '../../ui.jsx';
import { PageState, Person, useMutate, Edit } from '../../kit.jsx';
import { useRouter } from '../../router.jsx';
import { currentMonth, inr, ml, num } from '../../util.js';

export default function Salary() {
  const [month, setMonth] = useState(currentMonth());
  const q = useAsync(() => api(`/api/admin/reports/salary?month=${month}`), [month]);
  const mutate = useMutate(q.reload);
  const { navigate } = useRouter();
  const [busy, setBusy] = useState(false);
  async function csv() {
    setBusy(true);
    try {
      const blob = await api(`/api/admin/reports/salary.csv?month=${month}`, { blob: true });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `salary-${month}.csv`; a.click();
      URL.revokeObjectURL(a.href);
    } finally { setBusy(false); }
  }
  const d = q.data;
  return (
    <PageState q={q}>
      {d && (
        <div className="stack">
          <div className="toolbar"><MonthNav month={month} onChange={setMonth} max={currentMonth()} /><span className="grow" /><button type="button" className="btn" disabled={busy} onClick={csv}>Download CSV</button></div>
          <div className="tiles">
            <Tile icon="rupee" label={`Gross · ${ml(month)}`} value={inr(d.totals.gross)} tone="var(--primary)" />
            <Tile icon="adv" label="Advance deducted" value={inr(d.totals.deduction)} tone="var(--warn)" />
            <Tile icon="check" label="Net to pay" value={inr(d.totals.net)} tone="var(--good)" />
            <Tile icon="clock" label="Pending hours" value={num(d.totals.pendingHours)} tone="var(--muted)" />
          </div>
          <div className="card">
            <div className="scroll">
              <table>
                <thead><tr><th>Employee</th><th className="r">Days</th><th className="r">Half</th><th className="r">Double</th><th className="r">Hours</th><th className="r">Rate ₹/h</th><th className="r">Gross</th><th className="r">Advance due</th><th className="r">Deduct</th><th className="r">Net</th></tr></thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.employeeId}>
                      <td><Person name={r.name} photo={r.photo} size={32} onClick={() => navigate(`/admin/employee/${r.employeeId}`)} /></td>
                      <td className="r mono">{num(r.units)}</td><td className="r mono">{r.half}</td><td className="r mono">{r.double}</td>
                      <td className="r mono">{num(r.approvedHours)}{r.pendingHours > 0 && <small className="muted"> +{num(r.pendingHours)} pending</small>}</td>
                      <td className="r mono">{r.rate}</td><td className="r mono">{inr(r.gross)}</td>
                      <td className={`r mono ${r.outstanding > 0 ? 'neg' : ''}`}>{inr(r.outstanding)}</td>
                      <td className="r"><Edit className="sm" type="number" min="0" step="100" value={r.deduction} aria-label={`Deduction for ${r.name}`} onCommit={(v) => v >= 0 && mutate('PUT', '/api/admin/advances/deduction', { employeeId: r.employeeId, month, amount: v }, 'Deduction saved.')} /></td>
                      <td className="r mono"><b>{inr(r.net)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>Gross = approved hours × hourly rate. Net = gross − advance deducted this month. Only approved hours count.</p>
          </div>
        </div>
      )}
    </PageState>
  );
}
