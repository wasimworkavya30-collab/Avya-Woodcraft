import { api } from '../../api.js';
import { useAsync, Tile, Chip } from '../../ui.jsx';
import { PageState, Person } from '../../kit.jsx';
import { useRouter } from '../../router.jsx';
import { fmtTime, inr, ml } from '../../util.js';
import { TEAMS, teamOf } from '../../data.js';

const STATUS = {
  working: ['good', 'Working'],
  done: ['good', 'Done'],
  leave: ['warn', 'On leave'],
  off: ['', 'Sunday off'],
  out: ['', 'Not in yet'],
};

export default function Overview() {
  const q = useAsync(() => api('/api/admin/overview'), []);
  const { navigate } = useRouter();
  return (
    <PageState q={q}>
      {q.data && (() => {
        const d = q.data;
        return (
          <div className="stack">
            <div className="tiles">
              <Tile icon="users" label="Present now" value={<>{d.present}<small> / {d.total}</small></>} tone="var(--good)" />
              <Tile icon="sun" label="On leave" value={d.onLeave} tone="var(--warn)" />
              <Tile icon="clock" label="Not in yet" value={d.notIn} tone="var(--muted)" />
              <Tile icon="check" label="Hours to approve" value={d.counts.approvals} tone="var(--primary)" />
            </div>
            <div className="cols">
              <div className="card">
                <h3 style={{ marginBottom: 4 }}>Today at the workshop</h3>
                {d.employees.map((e) => {
                  const [k, label] = STATUS[e.status] || STATUS.out;
                  return (
                    <div className="logrow" key={e.id}>
                      <Person name={e.name} photo={e.photo} size={40} sub={`${e.role}${e.checkInAt ? ` · in ${fmtTime(e.checkInAt)}` : ''}${e.distance != null ? ` · ${e.distance} m` : ''}`} />
                      <span className="grow" />{e.isLead && <span className="lead">LEAD</span>}<Chip kind={k}>{label}</Chip>
                    </div>
                  );
                })}
              </div>
              <div className="stack">
                <div className="card">
                  <span className="cap">Approved payroll · {ml(d.payroll.month)}</span>
                  <div className="pay" style={{ marginTop: 6 }}><div className="big num">{inr(d.payroll.amount)}</div><button type="button" className="btn sm" onClick={() => navigate('/admin/salary')}>Open report</button></div>
                </div>
                <div className="card">
                  <h3 style={{ marginBottom: 12 }}>Team presence today</h3>
                  {TEAMS.map((t) => {
                    const r = d.teams.find((x) => x.id === t.id);
                    if (!r || !r.total) return null;
                    return (
                      <div key={t.id} style={{ '--tc': teamOf(t.id).c, marginBottom: 12 }}>
                        <div className="head-row" style={{ margin: '0 0 4px' }}><span className="tchip">{t.name}</span><span className="mono small">{r.present}/{r.total}</span></div>
                        <div className="track"><div className="bar" style={{ width: `${Math.round((r.present / r.total) * 100)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="card">
                  <span className="cap">Device security</span>
                  <p style={{ margin: '6px 0 10px' }}><b className="num">{d.blocked}</b> blocked attempts from unregistered phones.</p>
                  <button type="button" className="btn sm" onClick={() => navigate('/admin/devices')}>Review devices</button>
                </div>
                <div className="card">
                  <span className="cap">Petty cash</span>
                  <p style={{ margin: '6px 0 10px' }}><b className="num">{inr(d.pettyBalance)}</b> {d.pettyLow && <Chip kind="warn">Low</Chip>}</p>
                  <button type="button" className="btn sm" onClick={() => navigate('/admin/petty')}>Open petty cash</button>
                </div>
                <div className="card">
                  <span className="cap">Inventory</span>
                  <p style={{ margin: '6px 0 10px' }}><b className="num">{d.lowStock}</b> items low or out · <b className="num">{d.counts.requests}</b> open requests</p>
                  <button type="button" className="btn sm" onClick={() => navigate('/admin/inventory')}>Open inventory</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </PageState>
  );
}
