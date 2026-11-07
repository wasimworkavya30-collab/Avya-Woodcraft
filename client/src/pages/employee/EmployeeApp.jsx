import { useRouter, Link } from '../../router.jsx';
import { useAuth } from '../../auth.jsx';
import { Icon, Avatar } from '../../ui.jsx';
import Today from './Today.jsx';
import Work from './Work.jsx';
import Hours from './Hours.jsx';
import Leave from './Leave.jsx';
import Material from './Material.jsx';

const TABS = [['/employee', 'Today', 'clock'], ['/employee/work', 'Work', 'work'], ['/employee/hours', 'Hours', 'file'], ['/employee/material', 'Material', 'box'], ['/employee/leave', 'Leave', 'sun']];

export default function EmployeeApp() {
  const { path } = useRouter();
  const { user, logout } = useAuth();
  const Page = path.startsWith('/employee/work') ? Work : path.startsWith('/employee/hours') ? Hours : path.startsWith('/employee/leave') ? Leave : path.startsWith('/employee/material') ? Material : Today;
  return (
    <>
      <header className="ehead">
        <div className="in gut" style={{ maxWidth: 640, margin: '0 auto' }}>
          <Avatar name={user.name} src={user.photo} size={36} ring />
          <div className="grow"><b>Avya Woodcraft LLP</b><small>{user.name} · {user.code}</small></div>
          <button className="btn sm" onClick={logout}><Icon name="out" size={14} /> Log out</button>
        </div>
      </header>
      <main className="emp gut"><Page /></main>
      <nav className="bnav" aria-label="Sections">
        <div className="in" style={{ gridTemplateColumns: `repeat(${TABS.length},1fr)` }}>
          {TABS.map(([to, label, icon]) => (
            <Link key={to} to={to} className="bn"><Icon name={icon} size={20} />{label}</Link>
          ))}
        </div>
      </nav>
    </>
  );
}
