import { BAGIAN_LIST, type Stats } from '../types';
import {
  IconPlus,
  IconRegister,
  IconCheckCircle,
  IconAlertCircle,
  IconCalendar,
  IconFileText,
  IconChevronRight,
} from './Icons';

interface Props {
  stats: Stats;
  statsBagian: Record<string, number>;
  statsKategori: Record<string, { dinas: number; belanja: number }>;
  onNew: () => void;
  goToFilter: (kw: string) => void;
  goToBagian: (bg: string) => void;
}

const BAGIAN_COLOR_CLASSES: Record<string, string> = {
  UMUM: 'full-bg-umum',
  PEMBANGUNAN: 'full-bg-pembangunan',
  KESRA: 'full-bg-kesra',
  EKONOMI: 'full-bg-ekonomi',
  HUKUM: 'full-bg-hukum',
  PBJ: 'full-bg-pbj',
  ORGANISASI: 'full-bg-organisasi',
  PEMERINTAHAN: 'full-bg-pemerintahan',
  PROKOM: 'full-bg-prokom',
};

export default function Dashboard({
  stats,
  statsBagian,
  statsKategori,
  onNew,
  goToFilter,
  goToBagian,
}: Props) {
  return (
    <div className="dashboard-wrapper">
      {/* Hero Full Color Banner */}
      <div className="hero-action-card hero-action-fullcolor">
        <div className="hero-text">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="hero-badge">PORTAL VERIFIKASI</span>
            <span className="hero-subbadge">Setda Kab. Kobar</span>
          </div>
          <h3 className="hero-heading">Ringkasan Verifikasi SPJ Masuk</h3>
          <p className="hero-desc">
            Sub Bagian Keuangan · Sekretariat Daerah Kabupaten Kotawaringin Barat
          </p>
        </div>
        <div className="hero-cta-wrap">
          <button type="button" className="btn-hero-new" onClick={onNew}>
            <IconPlus size={16} />
            <span>Input SPJ Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Full Color KPI Stat Cards with maximum text legibility */}
      <div className="metrics-grid">
        <div
          className="metric-card-full card-color-total"
          onClick={() => goToFilter('ALL')}
          title="Klik untuk melihat semua register SPJ"
        >
          <div className="metric-card-header-full">
            <span className="metric-label-full">
              <IconRegister size={18} color="#ffffff" />
              <span>Total Register SPJ</span>
            </span>
            <span className="metric-badge-full">Semua Berkas</span>
          </div>
          <h2 className="metric-value-full">{stats.total}</h2>
          <div className="metric-footer-full">
            <span>Seluruh berkas terdaftar</span>
            <span className="footer-arrow">
              <IconChevronRight size={14} color="#ffffff" />
            </span>
          </div>
        </div>

        <div
          className="metric-card-full card-color-belum"
          onClick={() => goToFilter('belum proses')}
          title="Klik untuk memfilter berkas yang belum diproses"
        >
          <div className="metric-card-header-full">
            <span className="metric-label-full">
              <IconCalendar size={18} color="#ffffff" />
              <span>Belum Diproses</span>
            </span>
            <span className="metric-badge-full">Antrean</span>
          </div>
          <h2 className="metric-value-full">{stats.belum}</h2>
          <div className="metric-footer-full">
            <span>Menunggu verifikasi</span>
            <span className="footer-arrow">
              <IconChevronRight size={14} color="#ffffff" />
            </span>
          </div>
        </div>

        <div
          className="metric-card-full card-color-acc"
          onClick={() => goToFilter('acc')}
          title="Klik untuk memfilter berkas yang telah disetujui (ACC)"
        >
          <div className="metric-card-header-full">
            <span className="metric-label-full">
              <IconCheckCircle size={18} color="#ffffff" />
              <span>Disetujui (ACC)</span>
            </span>
            <span className="metric-badge-full">Lengkap</span>
          </div>
          <h2 className="metric-value-full">{stats.acc}</h2>
          <div className="metric-footer-full">
            <span>Berkas diverifikasi &amp; sah</span>
            <span className="footer-arrow">
              <IconChevronRight size={14} color="#ffffff" />
            </span>
          </div>
        </div>

        <div
          className="metric-card-full card-color-revisi"
          onClick={() => goToFilter('revisi')}
          title="Klik untuk memfilter berkas yang perlu revisi"
        >
          <div className="metric-card-header-full">
            <span className="metric-label-full">
              <IconAlertCircle size={18} color="#ffffff" />
              <span>Perlu Revisi</span>
            </span>
            <span className="metric-badge-full">Perbaikan</span>
          </div>
          <h2 className="metric-value-full">{stats.revisi}</h2>
          <div className="metric-footer-full">
            <span>Menunggu perbaikan berkas</span>
            <span className="footer-arrow">
              <IconChevronRight size={14} color="#ffffff" />
            </span>
          </div>
        </div>
      </div>

      {/* 9 Full Color Bagian Grid */}
      <div className="section-header">
        <div>
          <h4 className="section-title">Distribusi Berkas SPJ Per Bagian</h4>
          <p className="section-desc">
            Warna khas setiap Bagian. Klik kartu untuk membuka register SPJ bagian terkait.
          </p>
        </div>
      </div>

      <div className="bagian-modern-grid">
        {BAGIAN_LIST.map((b) => {
          const totalCount = statsBagian[b] || 0;
          const dinasCount = statsKategori[b]?.dinas ?? 0;
          const belanjaCount = statsKategori[b]?.belanja ?? 0;
          const colorClass = BAGIAN_COLOR_CLASSES[b] || 'full-bg-umum';

          return (
            <div
              className={`bagian-card-full ${colorClass}`}
              key={b}
              onClick={() => goToBagian(b)}
              title={`Klik untuk melihat register SPJ Bagian ${b}`}
            >
              <div className="bagian-card-top-full">
                <div className="d-flex align-items-center gap-2">
                  <IconFileText size={18} color="#ffffff" />
                  <span className="bagian-name-full">{b}</span>
                </div>
                <span className="bagian-count-badge-full">{totalCount} Berkas</span>
              </div>

              <div className="bagian-breakdown-full">
                <div className="breakdown-row-full">
                  <span>Perjalanan Dinas</span>
                  <span className="breakdown-val">{dinasCount} Berkas</span>
                </div>
                <div className="breakdown-row-full">
                  <span>Belanja Langsung</span>
                  <span className="breakdown-val">{belanjaCount} Berkas</span>
                </div>
              </div>

              <div className="bagian-footer-full">
                <span>Buka Register SPJ {b}</span>
                <span className="footer-arrow">
                  <IconChevronRight size={14} color="#ffffff" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
