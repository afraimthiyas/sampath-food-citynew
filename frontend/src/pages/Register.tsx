import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await register({ ...form, phone: form.phone || undefined });
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page auth-page single">
      <form className="card pad stack auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <label className="field">Full name<input className="input" required minLength={2} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></label>
        <label className="field">Email<input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label className="field">Phone (optional)<input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" /></label>
        <label className="field">Password<input className="input" type="password" required minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" /><small className="muted">At least 8 characters, with a letter and a number.</small></label>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
        <p className="muted center">Already registered? <Link to="/login" state={{ from }}>Log in</Link></p>
      </form>
    </div>
  );
}
