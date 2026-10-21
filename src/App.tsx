import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, supabase } from './lib/supabase';
import { confirmDelete, showToast } from './lib/alert';
import { computeStats, deleteSpj, fetchAllSpj, saveSpj } from './api/spj';
import { DEFAULT_FILTERS, type Filters, type Spj, type SpjInput } from './types';
import { cetakKartuSPJ } from './utils/cetakKartu';
import { exportToExcel } from './utils/exportExcel';
import { exportToPDF } from './utils/exportPdf';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Loader from './components/Loader';
import Login from './components/Login';
import Register from './components/Register';
import SpjForm from './components/SpjForm';

type Tab = 'home' | 'input' | 'list';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function Shell({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('home');
  const [list, setList] = useState<Spj[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Spj | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setList(await fetchAllSpj());
    } catch (e) {
      showToast('Error', 'Gagal memuat data! ' + errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const { stats, statsBagian, statsKategori } = useMemo(() => computeStats(list), [list]);
  const namaHistory = useMemo(() => {
    const set = new Set<string>();
    list.forEach((d) => d.pegawai.forEach((p) => { if (p.nama && p.nama !== '-') set.add(p.nama); }));
    return [...set].sort();
  }, [list]);

  const goTab = (t: Tab) => {
    setTab(t);
    if (t === 'list') void reload();
  };

  const showNewForm = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setTab('input');
  };

  const editRow = (item: Spj) => {
    setEditing(item);
    setFormKey((k) => k + 1);
    setTab('input');
  };

  const goToFilter = (kw: string) => {
    setFilters({ ...DEFAULT_FILTERS, search: kw === 'ALL' ? '' : kw });
    goTab('list');
  };

  const goToBagian = (bg: string) => {
    setFilters({ ...filters, bagian: bg, kategori: 'ALL' });
    goTab('list');
  };

  async function handleSubmit(input: SpjInput) {
    setLoading(true);
    try {
      const msg = await saveSpj(input);
      showToast('Berhasil', msg, 'success');
      await reload();
      setTab('list');
    } catch (e) {
      setLoading(false);
      showToast('Gagal', 'Gagal menyimpan data! ' + errMsg(e), 'error');
    }
  }

  async function handleDelete(item: Spj) {
    const nama = item.pegawai[0]?.nama || '-';
    if (!(await confirmDelete(nama))) return;
    setLoading(true);
    try {
      const msg = await deleteSpj(item.id);
      showToast('Berhasil', msg, 'success');
      await reload();
    } catch (e) {
      setLoading(false);
      showToast('Gagal', 'Terjadi kesalahan! ' + errMsg(e), 'error');
    }
  }

  const guardExport = (data: Spj[], run: (d: Spj[]) => void) => {
    if (data.length === 0) {
      return showToast('Peringatan', 'Data kosong / tidak ada hasil pada filter saat ini.', 'warning');
    }
    run(data);
  };

  const handlePrint = (item: Spj) => {
    cetakKartuSPJ(item);
    showToast('Berhasil', 'Kartu SPJ berhasil dicetak sebagai PNG!', 'success');
  };

  const tabBtn = (t: Tab, label: string) => (
    <li className="nav-item">
      <button type="button" className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => goTab(t)}>{label}</button>
    </li>
  );

  return (
    <>
      <Loader show={loading} />
      <Header email={session.user.email} onLogout={() => void supabase.auth.signOut()} />

      <ul className="nav nav-tabs">
        {tabBtn('home', 'DASHBOARD')}
        {tabBtn('input', 'INPUT DATA')}
        {tabBtn('list', 'REGISTER SPJ')}
      </ul>

      <div className="tab-content">
        <div className={tab === 'home' ? '' : 'pane-hidden'}>
          <Dashboard
            stats={stats} statsBagian={statsBagian} statsKategori={statsKategori}
            onNew={showNewForm} goToFilter={goToFilter} goToBagian={goToBagian}
          />
        </div>

        <div className={tab === 'input' ? '' : 'pane-hidden'}>
          <SpjForm
            key={formKey}
            editing={editing}
            namaHistory={namaHistory}
            onSubmit={handleSubmit}
            onCancel={() => setTab('home')}
          />
        </div>

        <div className={tab === 'list' ? '' : 'pane-hidden'}>
          <Register
            list={list}
            filters={filters}
            setFilters={setFilters}
            onEdit={editRow}
            onDelete={(it) => void handleDelete(it)}
            onPrint={handlePrint}
            onExcel={(data) => guardExport(data, exportToExcel)}
            onPdf={(data) => guardExport(data, exportToPDF)}
          />
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <>
        <Header />
        <div className="login-wrap">
          <div className="form-box login-box">
            <h5 className="fw-bold mb-3">Konfigurasi belum lengkap</h5>
            <p className="mb-0">
              Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code> (lokal)
              atau di Environment Variables (Vercel), lalu jalankan ulang.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!ready) return <Loader show />;
  if (!session) return <Login />;
  return <Shell session={session} />;
}
