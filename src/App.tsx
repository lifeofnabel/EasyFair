import { Suspense, lazy, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Icon, Logo } from './components/Icon';
import { SyncBadge } from './components/SyncBadge';
import { TranslateButton, TranslateProvider } from './components/Translate';
import { Sheet, Toasts } from './components/ui';
import { APP } from './config/app';
import Capture from './pages/Capture';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Phrases from './pages/Phrases';
import ProductDetail from './pages/ProductDetail';
import Products from './pages/Products';
import Stand from './pages/Stand';
import { session } from './services/session';
import { useStore } from './services/store';

// Fair-floor pages above are bundled for an instant offline start; the rest loads on demand (and is precached).
const Review = lazy(() => import('./pages/Review'));
const Projects = lazy(() => import('./pages/Projects'));
const Pdf = lazy(() => import('./pages/Pdf'));
const Settings = lazy(() => import('./pages/Settings'));
const Plan = lazy(() => import('./pages/Plan'));
const Pitch = lazy(() => import('./pages/Pitch'));
const Deal = lazy(() => import('./pages/Deal'));
const FollowUp = lazy(() => import('./pages/FollowUp'));
const More = lazy(() => import('./pages/More'));

function AddSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Add" onClose={onClose}>
      <div className="stack">
        <Link to="/stand?new=1" className="btn btn--big btn--pink" onClick={onClose}><Icon name="store" />Stand talk · 8 questions</Link>
        <Link to="/capture?new=1" className="btn btn--big" onClick={onClose}><Icon name="camera" />Quick capture · photo + note</Link>
      </div>
    </Sheet>
  );
}

function Nav() {
  const [add, setAdd] = useState(false);
  const cls = ({ isActive }: { isActive: boolean }) => `nav__item${isActive ? ' active' : ''}`;
  return (
    <>
      <nav className="nav no-print" aria-label="Main">
        <NavLink to="/" end className={cls}><Icon name="home" />Today</NavLink>
        <NavLink to="/products" className={cls}><Icon name="list" />Leads</NavLink>
        <button type="button" className="nav__add" aria-label="Add lead" onClick={() => setAdd(true)}><Icon name="plus" /></button>
        <NavLink to="/phrases" className={cls}><span className="nav__zh" lang="zh-CN" data-no-translate>中</span>Phrases</NavLink>
        <NavLink to="/more" className={cls}><Icon name="folder" />Toolkit</NavLink>
      </nav>
      {add && <AddSheet onClose={() => setAdd(false)} />}
    </>
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

/** Pages with their own header and a sticky action bar: no global header or bottom navigation. */
const FOCUS_PAGES = ['/pdf', '/capture', '/stand'];

function Shell() {
  const { pathname } = useLocation();
  const bare = FOCUS_PAGES.some((p) => pathname.startsWith(p));
  const ownHeader = ['/phrases', '/pitch', '/deal', '/plan', '/followup'].some((p) => pathname.startsWith(p));
  return (
    <div className={`app${bare ? ' app--bare' : ''}`}>
      {!bare && !ownHeader && <Header />}
      <Suspense fallback={<div className="page"><div className="skeleton" style={{ height: 160 }} /></div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stand" element={<Stand />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/captured/:id" element={<Navigate to="/" replace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/phrases" element={<Phrases />} />
          <Route path="/pitch" element={<Pitch />} />
          <Route path="/deal" element={<Deal />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/followup" element={<FollowUp />} />
          <Route path="/more" element={<More />} />
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
