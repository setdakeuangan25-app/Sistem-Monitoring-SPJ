import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/alert';
import Header from './Header';
import Loader from './Loader';

export default function Login() {
  const [email, setEmail] = useState('setdakeuangan25@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) showToast('Gagal masuk', 'Email atau password salah.', 'error');
  }

  return (
    <>
      <Loader show={busy} />
      <Header />
      <div className="login-wrap">
        <div className="form-box login-box">
          <h5 className="mb-4 border-bottom pb-3 fw-bold" style={{ color: '#1e293b' }}>Masuk</h5>
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                required
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="form-label fw-bold">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                required
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn fw-bold py-2 w-100"
              style={{ backgroundColor: '#4f46e5', color: 'white', borderRadius: 8 }}
            >
              MASUK
            </button>
            <div className="text-center mt-3 text-muted" style={{ fontSize: '0.8rem' }}>
              Klik <strong>MASUK</strong> untuk masuk ke Sistem Monitoring SPJ.
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
