import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, MonthNav, Chip } from '../../ui.jsx';
import { PageState, Person, useMutate } from '../../kit.jsx';
import DayEditor, { CODE } from './DayEditor.jsx';
import { currentMonth, daysIn, isSunday, num, pad, todayInTz } from '../../util.js';

const nthSunday = (d) => Math.ceil(Number(d.slice(8)) / 7);

export default function Report() {
  const [month, setMonth] = useState(currentMonth());
  const q = useAsync(() => api(`/api/admin/attendance/month?month=${month}`), [month]);
  const mutate = useMutate(q.reload);
  const [cell, setCell] = useState(null);
  const T = todayInTz();
  const d = q.data;
  const days = Array.from({ length: daysIn(month) }, (_, i) => `${month}-${pad(i + 1)}`);
  return (
    <PageState q={q}>
      {d && (() => {
        const weeks = d.policy.weeks, ov = d.policy.overrides || {};
        const sunOff = (date) => isSunday(date) && (date in ov ? ov[date] : weeks.includes(nthSunday(date)));
        const setWeeks = (w) => mutate('PUT', '/api/admin/settings/sunday', { weeks: w }, 'Sunday policy saved.');
        const row = d.rows.find((r) => r.employeeId === cell?.emp);
        const rec = row?.days[cell?.date];
        const cellInfo = (r, date) => {
          const x = r.days[date];
          if (x) return [CODE[x.dayType] || 'C', x.dayType, x.units];
          if (r.leaves.includes(date)) return ['L', 'leave'];
          if (sunOff(date)) return ['S', 'off'];
          return date <= T && !isSunday(date) ? ['A', 'absent'] : ['', ''];
        };
        return (
          <div className="stack">
            <div className="toolbar">
              <MonthNav month={month} onChange={(m) => { setMonth(m); setCell(null); }} max={currentMonth()} />
              <span className="grow" />
              <div className="small" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>Sunday off:</b>
                {[1, 2, 3, 4, 5].map((w) => (
                  <label key={w} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={weeks.includes(w)} onChange={() => setWeeks(weeks.includes(w) ? weeks.filter((x) => x !== w) : [...weeks, w].sort())} />{w === 1 ? '1st' : w === 2 ? '2nd' : w === 3 ? '3rd' : `${w}th`}
                  </label>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="legend" style={{ marginBottom: 8 }}>
                <span><Chip kind="good">P</Chip> Full</span><span><Chip kind="good">H</Chip> Half</span><span><Chip kind="good">D</Chip> Double</span><span><Chip kind="good">C</Chip> Custom</span><span><Chip kind="warn">L</Chip> Leave</span><span><Chip>S</Chip> Sunday off</span><span><Chip kind="bad">A</Chip> Absent</span>
              </div>
              <div className="scroll">
                <table className="mx">
                  <thead><tr><th>Employee</th>{days.map((x) => <th key={x} className={sunOff(x) ? 'sun' : ''}>{Number(x.slice(8))}</th>)}<th className="r">Days</th><th className="r">Hours</th></tr></thead>
                  <tbody>
                    {d.rows.map((r) => {
                      const tot = Object.values(r.days).reduce((a, x) => a + x.units, 0);
                      const h = Object.values(r.days).reduce((a, x) => a + x.hours, 0);
                      return (
                        <tr key={r.employeeId}>
                          <td><Person name={r.name} photo={r.photo} size={28} /></td>
                          {days.map((x) => {
                            const [c, k, u] = cellInfo(r, x);
                            return (
                              <td key={x} className={sunOff(x) ? 'sun' : ''}>
                                <button type="button" className={`cell ${k}`} aria-label={`${r.name}, ${x}`} onClick={() => setCell({ emp: r.employeeId, date: x })}>{c}{u && u !== 1 && c !== 'H' && c !== 'D' ? <sub>{u}</sub> : null}</button>
                              </td>
                            );
                          })}
                          <td className="r mono"><b>{num(tot)}</b></td><td className="r mono">{num(h)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="small muted" style={{ margin: '10px 0 0' }}>Click any day to add, change or remove it. This works for past months too, so the real old records can be filled in.</p>
            </div>
            {cell && row && (
              <DayEditor key={`${cell.emp}${cell.date}`} name={row.name} date={cell.date} rec={rec}
                sundayOff={sunOff(cell.date)}
                onSundayToggle={isSunday(cell.date) ? () => mutate('PUT', '/api/admin/settings/sunday', { override: { date: cell.date, off: !sunOff(cell.date) } }, 'Saved.') : undefined}
                onSave={async (b) => { if (await mutate('PUT', '/api/admin/attendance/day', { employeeId: cell.emp, date: cell.date, ...b }, 'Day saved.')) setCell(null); }}
                onClear={async () => { if (await mutate('PUT', '/api/admin/attendance/day', { employeeId: cell.emp, date: cell.date, days: 0, hours: 0 }, 'Day removed.')) setCell(null); }}
                onLeave={async () => { if (await mutate('POST', '/api/admin/attendance/leave-day', { employeeId: cell.emp, date: cell.date }, 'Leave marked.')) setCell(null); }}
                onClose={() => setCell(null)} />
            )}
          </div>
        );
      })()}
    </PageState>
  );
}
