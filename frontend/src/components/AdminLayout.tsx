import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z' },
  { to: '/admin/orders', label: 'Orders', icon: 'M6 2h12l2 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zM4 7h16M9 11h6' },
  { to: '/admin/products', label: 'Products', icon: 'M21 8l-9-5-9 5v8l9 5 9-5zM3.3 7.7L12 13l8.7-5.3M12 22V13' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
  { to: '/admin/customers', label: 'Customers', icon: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
];

export default function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-role">Back office<small>{user?.role === 'ADMIN' ? 'Administrator' : 'Store manager'}</small></div>
        <nav aria-label="Admin">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={l.icon} /></svg>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="admin-content"><Outlet /></section>
    </div>
  );
}
