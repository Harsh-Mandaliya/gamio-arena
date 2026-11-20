import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import SiteFooter from './SiteFooter.jsx';
import SiteHeader from './SiteHeader.jsx';

export default function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="site">
      <SiteHeader />
      <main className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
