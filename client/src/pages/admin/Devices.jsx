import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Chip } from '../../ui.jsx';
import { PageState, useMutate } from '../../kit.jsx';
import { fmtDateTime } from '../../util.js';

export default function Devices() {
  const q = useAsync(() => api('/api/admin/devices'), []);
  const mutate = useMutate(q.reload);
  const [code, setCode] = useState(null);
  async function make() {
    const r = await mutate('POST', '/api/admin/devices/pairing-code', {}, 'New pairing code created.');
    if (r && r.code) setCode(r);
  }
  const d = q.data;
  return (
    <PageState q={q}>
      {d && (
        <div className="cols even">
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Authorized company mobile</h3>
            {d.device ? <p style={{ margin: '0 0 8px' }}><Chip kind="good">Paired</Chip> {d.device.label} · since {fmtDateTime(d.device.pairedAt)}</p> : <p className="muted">No phone is paired yet.</p>}
            <p className="small muted">Open the app on the shared phone, go to the pairing screen and enter the code. A new code replaces the old phone.</p>
            <button type="button" className="btn primary" onClick={make}>{d.device ? 'Replace phone (new code)' : 'Create pairing code'}</button>
            {code && <div className="card" style={{ marginTop: 12 }}><span className="cap">One-time code, valid {code.minutes} minutes</span><div className="big mono" style={{ letterSpacing: '.2em' }}>{code.code}</div></div>}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Blocked attempts</h3>
            {d.blocked.map((b) => <div className="logrow" key={b.id}><div className="grow"><b>{b.name || 'Unknown'}</b><br /><span className="small muted">{b.reason}</span></div><span className="small muted">{fmtDateTime(b.at)}</span></div>)}
            {!d.blocked.length && <p className="muted">No blocked attempts.</p>}
          </div>
        </div>
      )}
    </PageState>
  );
}
