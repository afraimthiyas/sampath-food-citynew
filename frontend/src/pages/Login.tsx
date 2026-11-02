import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { label: 'Customer', email: 'customer@sampathfoodcity.demo', password: 'Customer@123', hint: 'Shop & track orders' },
  { label: 'Manager', email: 'manager@sampathfoodcity.demo', password: 'Manager@123', hint: 'Back office' },
  { label: 'Admin', email: 'admin@sampathfoodcity.demo', password: 'Admin@123', hint: 'Full access' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const user = await login(email, password);
      navigate(from ?? (user.role === 'CUSTOMER' ? '/' : '/admin'), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page auth-page">
      <form className="card pad stack auth-card" onSubmit={submit}>
        <h1>Welcome back</h1>
        <p className="muted">Log in to check out faster and track your orders.</p>
        <label className="field">Email<input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field">Password<input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="muted center">New here? <Link to="/register" state={{ from }}>Create an account</Link></p>
      </form>

      <aside className="card pad stack demo-box">
        <h2>Try the demo</h2>
        <p className="muted">Pick a role to fill in the credentials, then press <strong>Log in</strong>. The API enforces role-based access, so each account sees different features.</p>
        {DEMO.map((d) => (
          <button key={d.label} type="button" className="demo-account" onClick={() => { setEmail(d.email); setPassword(d.password); }}>
            <strong>{d.label}</strong><span>{d.hint}</span><code>{d.email}</code>
          </button>
        ))}
      </aside>
    </div>
  );
}
