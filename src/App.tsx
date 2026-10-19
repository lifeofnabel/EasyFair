import { Suspense, lazy } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Icon, Logo } from './components/Icon';
import { SyncBadge } from './components/SyncBadge';
import { TranslateButton, TranslateProvider } from './components/Translate';
import { Toasts } from './components/ui';
import { APP } from './config/app';
import Capture from './pages/Capture';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ProductDetail from './pages/ProductDetail';
import Products from './pages/Products';
import { session } from './services/session';
import { useStore } from './services/store';

// Home-only pages load on demand; the fair flow above is bundled for instant offline start.
const Review = lazy(() => import('./pages/Review'));
const Projects = lazy(() => import('./pages/Projects'));
const Pdf = lazy(() => import('./pages/Pdf'));
const Settings = lazy(() => import('./pages/Settings'));

function Nav() {
  const cls = ({ isActive }: { isActive: boolean }) => `nav__item${isActive ? ' active' : ''}`;
  return (
    <nav className="nav no-print" aria-label="Main">
      <NavLink to="/" end className={cls}><Icon name="home" />Today</NavLink>
      <NavLink to="/products" className={cls}><Icon name="list" />Products</NavLink>
      <NavLink to="/capture" className="nav__add" aria-label="Add product"><Icon name="plus" /></NavLink>
      <NavLink to="/review" className={cls}><Icon name="review" />Review</NavLink>
      <NavLink to="/projects" className={cls}><Icon name="folder" />Projects</NavLink>
    </nav>
  );
}

function Header() {
  return (
    <header className="page no-print" style={{ paddingBottom: 0 }}>
      <div className="topbar">
        <NavLink to="/" className="brand"><Logo /><span className="brand__name" data-no-translate>{APP.name}</span></NavLink>
        <div className="row">
          <SyncBadge />
          <TranslateButton />
          <NavLink to="/settings" className="icon-btn" aria-label="Settings"><Icon name="settings" /></NavLink>
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const bare = pathname.startsWith('/pdf') || pathname.startsWith('/capture');
  return (
    <div className={`app${bare ? ' app--bare' : ''}`}>
      {!bare && <Header />}
      <Suspense fallback={<div className="page"><div className="skeleton" style={{ height: 160 }} /></div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/captured/:id" element={<Navigate to="/" replace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/review" element={<Review />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/pdf/:id" element={<Pdf />} />
          <Route path="/export" element={<Navigate to="/products" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Suspense>
      {!bare && <Nav />}
      <Toasts />
    </div>
  );
}

export default function App() {
  const auth = useStore(session);
  if (auth.status === 'loading') return <div className="login"><span style={{ width: 56, height: 56, color: 'var(--pink)' }}><Logo /></span></div>;
  if (auth.status === 'signed_out') return <><Login /><Toasts /></>;
  return <TranslateProvider><Shell /></TranslateProvider>;
}
