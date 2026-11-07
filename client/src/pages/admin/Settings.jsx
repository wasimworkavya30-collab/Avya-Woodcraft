import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync } from '../../ui.jsx';
import { PageState, useMutate, Edit, Confirm, PhotoButton } from '../../kit.jsx';
import { getPosition } from '../../util.js';

export default function Settings() {
  const q = useAsync(() => api('/api/admin/settings'), []);
  const mutate = useMutate(q.reload);
  const [task, setTask] = useState('');
  const d = q.data;
  const put = (b) => mutate('PUT', '/api/admin/settings', b, 'Saved.');
  async function here() {
    try { const p = await getPosition(); put({ workshopLat: p.lat, workshopLng: p.lng }); } catch (e) { alert(e.message); }
  }
  return (
    <PageState q={q}>
      {d && (
        <div className="cols even">
          <div className="stack">
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Company</h3>
              <div className="rowform">
                <label className="field"><span>Company name</span><Edit value={d.companyName} maxLength={80} onCommit={(v) => v && put({ companyName: v })} /></label>
                <label className="field"><span>CEO name</span><Edit value={d.ceoName} maxLength={60} onCommit={(v) => v && put({ ceoName: v })} /></label>
                <PhotoButton label="CEO photo" onPick={(photo) => mutate('POST', '/api/admin/settings/ceo-photo', { photo }, 'Photo updated.')} />
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Workshop location and punch rules</h3>
              <div className="rowform">
                <label className="field"><span>Latitude</span><Edit type="number" step="any" value={d.workshopLat} onCommit={(v) => v != null && put({ workshopLat: v })} /></label>
                <label className="field"><span>Longitude</span><Edit type="number" step="any" value={d.workshopLng} onCommit={(v) => v != null && put({ workshopLng: v })} /></label>
                <label className="field"><span>Allowed radius (m)</span><Edit type="number" min="20" value={d.radiusM} onCommit={(v) => v >= 20 && put({ radiusM: v })} /></label>
                <label className="field"><span>Max GPS error (m)</span><Edit type="number" min="10" value={d.maxAccuracyM} onCommit={(v) => v >= 10 && put({ maxAccuracyM: v })} /></label>
                <label className="field"><span>Unpaid break (minutes)</span><Edit type="number" min="0" value={d.breakMinutes} onCommit={(v) => v >= 0 && put({ breakMinutes: v })} /></label>
                <label className="field"><span>Break applies after (hours)</span><Edit type="number" min="0" step="0.5" value={d.breakAfterHours} onCommit={(v) => v >= 0 && put({ breakAfterHours: v })} /></label>
              </div>
              <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={here}>Use my current location as the workshop</button>
              <p className="small muted" style={{ margin: '10px 0 0' }}>Do this once while standing at the workshop, on the shared phone or any phone with GPS.</p>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Kinds of work employees can log</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {d.taskTypes.map((t) => <span className="who" key={t.id}>{t.name}<Confirm iconOnly label="Remove" ariaLabel={`Remove ${t.name}`} onYes={() => mutate('DELETE', `/api/admin/settings/task-types/${t.id}`, undefined, 'Removed.')} /></span>)}
            </div>
            <form className="inl" onSubmit={async (e) => { e.preventDefault(); const r = await mutate('POST', '/api/admin/settings/task-types', { name: task }, 'Added.'); if (r) setTask(''); }}>
              <input required maxLength={40} placeholder="Example: Upholstery" value={task} onChange={(e) => setTask(e.target.value)} aria-label="New kind of work" />
              <button className="btn primary">Add</button>
            </form>
          </div>
        </div>
      )}
    </PageState>
  );
}
