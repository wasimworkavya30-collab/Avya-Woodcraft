import { useState } from 'react';
import { api, saveDeviceToken, clearDeviceToken } from '../api.js';
import { useAsync, useToast } from '../ui.jsx';
import { Link } from '../router.jsx';

export default function DeviceSetup() {
  const toast = useToast();
  const status = useAsync(() => api('/api/device/status'), []);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('Company mobile');
  const [busy, setBusy] = useState(false);

  async function pair(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/api/device/pair', { method: 'POST', body: { code, label } });
      saveDeviceToken(r.deviceToken);
      toast('This phone is now the company mobile.');
      setCode('');
      status.reload();
    } catch (err) {
      toast(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  function unpair() {
    clearDeviceToken();
    status.reload();
    toast('This phone is no longer set as the company mobile.');
  }

  return (
    <main className="lform" style={{ minHeight: '100vh' }}>
      <div className="card">
        <img className="logo" src="/logo.png" alt="" width="52" style={{ marginBottom: 12 }} />
        <h2>Company mobile setup</h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          Only one phone can mark attendance. In the admin panel open <b>Devices</b>, create a pairing code, and type it here.
        </p>
        {status.data?.authorized ? (
          <>
            <p><span className="chip good">This phone is the company mobile</span></p>
            <button className="btn" onClick={unpair}>Remove this phone</button>
          </>
        ) : (
          <form onSubmit={pair}>
            <label className="field"><span>8-digit pairing code</span><input inputMode="numeric" maxLength={8} pattern="\d{8}" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></label>
            <label className="field"><span>Phone name</span><input maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} /></label>
            <button className="btn primary big" disabled={busy || code.length !== 8}>{busy ? 'Pairing…' : 'Pair this phone'}</button>
          </form>
        )}
        <p className="small" style={{ marginTop: 16 }}><Link to="/login">‹ Back to login</Link></p>
      </div>
    </main>
  );
}
