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
import {
  IconDashboard,
  IconRegister,
  IconAdd,
  IconFileText,
  IconLogout,
  IconChevronLeft,
  IconMenu,
  IconClose,
} from './components/Icons';

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

  // Desktop sidebar collapse state
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('spj_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Mobile drawer slide-in state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('spj_sidebar_open', String(next));
        } catch {}
        return next;
      });
    }
  };

  const closeMobileDrawer = () => {
    setMobileMenuOpen(false);
  };

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

  useEffect(() => {
    void reload();
  }, [reload]);

  const { stats, statsBagian, statsKategori } = useMemo(() => computeStats(list), [list]);
  const namaHistory = useMemo(() => {
    const set = new Set<string>();
    list.forEach((d) =>
      d.pegawai.forEach((p) => {
        if (p.nama && p.nama !== '-') set.add(p.nama);
      }),
    );
    return [...set].sort();
  }, [list]);

  const goTab = (t: Tab) => {
    setTab(t);
    closeMobileDrawer();
    if (t === 'list') void reload();
  };

  const showNewForm = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setTab('input');
    closeMobileDrawer();
  };

  const editRow = (item: Spj) => {
    setEditing(item);
    setFormKey((k) => k + 1);
    setTab('input');
    closeMobileDrawer();
  };

  const goToFilter = (kw: string) => {
    setFilters({
      ...DEFAULT_FILTERS,
      search: kw === 'ALL' ? '' : kw,
      sortKey: 'tglMasuk',
      sortAsc: false,
    });
    goTab('list');
  };

  const goToBagian = (bg: string) => {
    setFilters({
      ...DEFAULT_FILTERS,
      bagian: bg,
      kategori: 'ALL',
      sortKey: 'tglMasuk',
      sortAsc: false,
    });
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
      return showToast(
        'Peringatan',
        'Data kosong / tidak ada hasil pada filter saat ini.',
        'warning',
      );
    }
    run(data);
  };

  const handlePrint = (item: Spj) => {
    cetakKartuSPJ(item);
    showToast('Berhasil', 'Kartu SPJ berhasil dicetak sebagai berkas gambar PNG!', 'success');
  };

  // Header titles
  const headerMeta = useMemo(() => {
    if (tab === 'home') {
      return {
        title: 'Dashboard Monitoring SPJ',
        subtitle: 'Statistik & distribusi berkas verifikasi 9 Bagian Setda Kab. Kobar',
      };
    }
    if (tab === 'list') {
      return {
        title: 'Register Surat Pertanggungjawaban',
        subtitle: 'Urutan otomatis dari tanggal terbaru · Kolom dapat digeser & disesuaikan',
      };
    }
    return {
      title: editing ? 'Perbarui Data SPJ' : 'Input Berkas SPJ Baru',
      subtitle: 'Formulir pencatatan dan verifikasi kelengkapan berkas SPJ',
    };
  }, [tab, editing]);

  const userEmail = session.user.email || 'setdakeuangan25@gmail.com';
  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <>
      <Loader show={loading} />

      <div className="app-layout">
        {/* Mobile Backdrop Overlay for Drawer */}
        {mobileMenuOpen && (
          <div
            className="drawer-backdrop"
            onClick={closeMobileDrawer}
            title="Tutup menu"
          />
        )}

        {/* Sidebar (Desktop Collapsible & Mobile Slide-in Drawer) */}
        <aside
          className={`app-sidebar ${
            !sidebarOpen ? 'sidebar-hidden' : ''
          } ${mobileMenuOpen ? 'mobile-drawer-open' : ''}`}
        >
          <div>
            <div className="brand-section d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <div className="brand-icon-box">
                  <IconFileText size={22} color="#ffffff" />
                </div>
                <div>
                  <h1 className="brand-title">SPJ Monitoring</h1>
                  <div className="brand-subtitle">Setda Kab. Kobar</div>
                </div>
              </div>

              {/* Close Button on Mobile Drawer / Collapse Button on Desktop */}
              <button
                type="button"
                className="btn-hide-sidebar"
                onClick={toggleSidebar}
                title={mobileMenuOpen ? 'Tutup menu' : 'Sembunyikan menu samping'}
              >
                {mobileMenuOpen ? <IconClose size={16} /> : <IconChevronLeft size={16} />}
              </button>
            </div>

            <nav className="sidebar-nav">
              <button
                type="button"
                className={`nav-pill-btn ${tab === 'home' ? 'active' : ''}`}
                onClick={() => goTab('home')}
              >
                <span className="nav-pill-icon">
                  <IconDashboard size={19} />
                </span>
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                className={`nav-pill-btn ${tab === 'list' ? 'active' : ''}`}
                onClick={() => goTab('list')}
              >
                <span className="nav-pill-icon">
                  <IconRegister size={19} />
                </span>
                <span>Register SPJ</span>
              </button>

              <button
                type="button"
                className={`nav-pill-btn ${tab === 'input' ? 'active' : ''}`}
                onClick={() => showNewForm()}
              >
                <span className="nav-pill-icon">
                  <IconAdd size={19} />
                </span>
                <span>Input SPJ Baru</span>
              </button>
            </nav>
          </div>

          {/* User profile & Logout in Sidebar */}
          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-info">
                <div className="user-avatar">{initial}</div>
                <div className="user-details">
                  <div className="user-email" title={userEmail}>
                    {userEmail}
                  </div>
                  <div className="user-status">
                    <span className="status-dot" />
                    <span>Verifikator Aktif</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-logout-minimal"
                onClick={() => void supabase.auth.signOut()}
                title="Keluar dari akun verifikator"
              >
                <IconLogout size={14} />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Floating Canvas Panel */}
        <main className={`app-main ${!sidebarOpen ? 'main-expanded' : ''}`}>
          <Header
            title={headerMeta.title}
            subtitle={headerMeta.subtitle}
            showNewButton={tab !== 'input'}
            onNew={showNewForm}
            onReload={() => void reload()}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
          />

          <div className="panel-scrollable">
            <div className={tab === 'home' ? '' : 'pane-hidden'}>
              <Dashboard
                stats={stats}
                statsBagian={statsBagian}
                statsKategori={statsKategori}
                onNew={showNewForm}
                goToFilter={goToFilter}
                goToBagian={goToBagian}
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

          {/* Mobile Bottom Navigation Bar (Fixed at bottom on phones) */}
          <nav className="mobile-bottom-nav">
            <button
              type="button"
              className={`bottom-nav-item ${tab === 'home' ? 'active' : ''}`}
              onClick={() => goTab('home')}
            >
              <IconDashboard size={20} />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`bottom-nav-item ${tab === 'list' ? 'active' : ''}`}
              onClick={() => goTab('list')}
            >
              <IconRegister size={20} />
              <span>Register</span>
            </button>

            <button
              type="button"
              className={`bottom-nav-item ${tab === 'input' ? 'active' : ''}`}
              onClick={() => showNewForm()}
            >
              <IconAdd size={20} />
              <span>Input SPJ</span>
            </button>

            <button
              type="button"
              className={`bottom-nav-item ${mobileMenuOpen ? 'active' : ''}`}
              onClick={toggleSidebar}
            >
              <IconMenu size={20} />
              <span>Menu</span>
            </button>
          </nav>
        </main>
      </div>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <div className="modern-login-canvas">
        <div className="modern-login-card">
          <h2 className="login-title mb-2">Konfigurasi Belum Lengkap</h2>
          <p className="login-subtitle">
            Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di file{' '}
            <code>.env</code> atau jalankan dengan mode fallback default.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) return <Loader show />;
  if (!session) return <Login />;
  return <Shell session={session} />;
}
