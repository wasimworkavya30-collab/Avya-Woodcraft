import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Spinner, ErrorBox, Chip, MonthNav } from '../../ui.jsx';
import { currentMonth, fmtDate, fmtTime, hrs, inr, ml, STATUS_LABEL } from '../../util.js';

const KIND = { approved: 'good', pending: 'warn', open: 'info', rejected: 'bad' };

export default function Hours() {
  const [month, setMonth] = useState(currentMonth());
  const q = useAsync(() => api(`/api/employee/attendance?month=${month}`), [month]);
  const t = q.data?.totals;
  return (
    <div className="stack">
      <div className="card">
        <div className="head-row"><h3>Pay estimate</h3><MonthNav month={month} onChange={setMonth} max={currentMonth()} /></div>
        {q.loading && !q.data ? <Spinner /> : q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : (
          <>
            <div className="pay">
              <div><span className="cap">Payable for {ml(month)}</span><div className="big num">{inr(t.net ?? t.payable)}</div></div>
              <div className="formula">{hrs(t.approvedHours)} approved × {inr(t.hourlyRate)}</div>
            </div>
            {t.deduction > 0 && <p className="small" style={{ margin: '10px 0 0' }}>Gross {inr(t.payable)} − advance deducted <b>{inr(t.deduction)}</b> = <b>{inr(t.net)}</b></p>}
            {t.outstanding > 0 && <p className="small muted" style={{ margin: '4px 0 0' }}>Advance still to recover after this month: {inr(t.outstanding)}</p>}
            <p className="small muted" style={{ margin: '10px 0 0' }}>{t.units ?? t.days} days. {t.pendingHours > 0 ? `${hrs(t.pendingHours)} waiting for approval.` : 'No hours waiting for approval.'}</p>
          </>
        )}
      </div>
      {q.data && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Days in {ml(month)}</h3>
          {q.data.rows.length ? q.data.rows.map((r) => (
            <div className="logrow" key={r.id}>
              <div className="grow"><b>{fmtDate(r.work_date)}</b><br /><span className="small muted mono">{fmtTime(r.check_in_at)} → {r.check_out_at ? fmtTime(r.check_out_at) : 'open'}</span></div>
              <span className="mono">{r.status === 'approved' ? hrs(r.approved_hours) : r.suggested_hours != null ? hrs(r.suggested_hours) : '–'}</span>
              <Chip kind={KIND[r.status]}>{STATUS_LABEL[r.status]}</Chip>
            </div>
          )) : <p className="muted">No punches in this month yet.</p>}
        </div>
      )}
    </div>
  );
}
