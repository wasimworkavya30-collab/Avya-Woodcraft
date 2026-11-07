import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// A tiny router built on the browser History API (no extra dependency).
const RouterContext = createContext(null);

export function Router({ children }) {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === window.location.pathname) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

export function Link({ to, className = '', activeClassName = 'on', exact = true, children, ...rest }) {
  const { path, navigate } = useRouter();
  const active = exact ? path === to : path === to || path.startsWith(`${to}/`);
  return (
    <a
      href={to}
      className={`${className} ${active ? activeClassName : ''}`.trim()}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
