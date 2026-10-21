import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/alert';
import Loader from './Loader';
import { IconFileText } from './Icons';

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
    <div className="modern-login-canvas">
      <Loader show={busy} />
      <div className="modern-login-card">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="login-emblem mb-0">
            <IconFileText size={26} />
          </div>
          <div>
            <h1 className="login-title">SPJ Monitoring</h1>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Setda Kab. Kotawaringin Barat
            </div>
          </div>
        </div>

        <p className="login-subtitle">
          Sistem Informasi Verifikasi Berkas SPJ Sub Bagian Keuangan Sekretariat Daerah.
        </p>

        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label-modern">Email Verifikator</label>
            <input
              type="email"
              className="form-input-modern"
              value={email}
              required
              autoComplete="username"
              placeholder="nama@kobar.go.id"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label-modern mb-0">Kata Sandi</label>
            </div>
            <input
              type="password"
              className="form-input-modern"
              value={password}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-dark-pill w-100 justify-content-center py-3"
            style={{ fontSize: '0.92rem' }}
          >
            Masuk ke Sistem &rarr;
          </button>

          <div className="login-helper-box text-center">
            Mode Akses Terverifikasi · Klik <strong>Masuk ke Sistem</strong> untuk langsung menjelajahi dashboard monitoring.
          </div>
        </form>
      </div>
    </div>
  );
}
