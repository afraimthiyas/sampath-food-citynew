import { FormEvent, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';

function Header() {
  const { user, isStaff, logout } = useAuth();
  const { count, setOpen } = useCart();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="Sampath Food City home">
          <img src="/logo.svg" alt="" width={38} height={38} />
          <span className="brand-text"><strong>Sampath Food City</strong><small>Fresh · Local · Daily</small></span>
        </Link>

        <form className="header-search" onSubmit={submit} role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rice, tea, vegetables…" aria-label="Search products" />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        <nav className="header-nav" aria-label="Main">
          <NavLink to="/shop">Shop</NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {isStaff && <NavLink to="/admin">Admin</NavLink>}
          {!user && <NavLink to="/login" className="nav-login">Log in</NavLink>}
        </nav>

        <div className="header-actions">
          <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Open cart, ${count} items`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /></svg>
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
          {user ? (
            <div className="user-chip">
              <span className="avatar" aria-hidden="true">{user.fullName.charAt(0)}</span>
              <span className="user-meta"><strong>{user.fullName.split(' ')[0]}</strong><small>{user.role.toLowerCase()}</small></span>
              <button className="link-btn" onClick={() => { logout(); navigate('/'); }}>Log out</button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <strong>Sampath Food City</strong>
          <p>Online grocery store &amp; store management demo built with React, NestJS and PostgreSQL.</p>
        </div>
        <p className="footer-note">
          Portfolio project. Not affiliated with, or endorsed by, any real supermarket business. Products, prices and
          customers are fictional demo data.
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <>
      <Header />
      <main className="main"><Outlet /></main>
      <Footer />
      <CartDrawer />
    </>
  );
}
