import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAsync, useToast, Icon, Seg } from '../ui.jsx';
import { Link } from '../router.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState('employee');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ code: '', pin: '', email: '', password: '' });
  const dev = useAsync(() => api('/api/device/status'), []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = role === 'admin' ? { email: f.email, password: f.password } : { code: f.code, pin: f.pin };
      login(await api(`/api/auth/${role}-login`, { method: 'POST', body }));
    } catch (err) {
      toast(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  const company = dev.data?.companyName || 'Avya Woodcraft LLP';
  return (
    <main className="login">
      <section className="lbrand">
        <img className="logo" src="/logo.png" alt={company} width="84" style={{ filter: 'invert(1)' }} />
        <div>
          <span className="cap" style={{ color: '#D9B866' }}>{company}</span>
          <h1 style={{ marginTop: 8 }}>Attendance, payroll and workshop operations in one place.</h1>
        </div>
        <p>Every hour is verified on the shared company mobile, approved by the admin and turned into salary.</p>
        <ul className="feat">
          <li><i><Icon name="phone" size={16} /></i><span><b>Authorized company mobile only.</b><br />Personal phones are blocked and logged.</span></li>
          <li><i><Icon name="pin" size={16} /></i><span><b>Selfie and GPS on every punch.</b><br />Location must be within the workshop radius.</span></li>
          <li><i><Icon name="rupee" size={16} /></i><span><b>Salary from approved hours.</b><br />Approved hours × hourly rate.</span></li>
        </ul>
      </section>
      <section className="lform">
        <form className="card" onSubmit={submit}>
          <div style={{ marginBottom: 18 }}>
            <Seg label="Login as" value={role} onChange={setRole} options={[['employee', 'Employee'], ['admin', 'Main Admin']]} />
          </div>
          <h2 style={{ marginBottom: 14 }}>{role === 'admin' ? 'Admin login' : 'Employee login'}</h2>
          {role === 'admin' ? (
            <>
              <label className="field"><span>Admin email</span><input type="email" autoComplete="username" required value={f.email} onChange={set('email')} /></label>
              <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={f.password} onChange={set('password')} /></label>
            </>
          ) : (
            <>
              <label className="field"><span>Employee code</span><input type="text" autoCapitalize="characters" placeholder="AW-101" required value={f.code} onChange={set('code')} /></label>
              <label className="field"><span>PIN</span><input type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" required value={f.pin} onChange={set('pin')} /></label>
            </>
          )}
          <button className="btn primary big" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
          <div className="devbox">
            <span className="muted">This phone</span>
            {dev.loading ? <span className="muted">Checking…</span> : dev.data?.authorized ? <span className="chip good">Company mobile</span> : <span className="chip">Not the company mobile</span>}
          </div>
          {!dev.data?.authorized && <p className="small muted" style={{ margin: '10px 0 0' }}>Setting up the company mobile? <Link to="/device">Pair this phone</Link>.</p>}
        </form>
      </section>
    </main>
  );
}
