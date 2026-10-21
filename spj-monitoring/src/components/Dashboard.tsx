import { BAGIAN_LIST, type Stats } from '../types';

interface Props {
  stats: Stats;
  statsBagian: Record<string, number>;
  statsKategori: Record<string, { dinas: number; belanja: number }>;
  onNew: () => void;
  goToFilter: (kw: string) => void;
  goToBagian: (bg: string) => void;
}

export default function Dashboard({ stats, statsBagian, statsKategori, onNew, goToFilter, goToBagian }: Props) {
  return (
    <div className="container-fluid">
      <div className="text-center mb-4 mt-2">
        <button type="button" className="btn btn-add-main" onClick={onNew}>
          <span style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: 4 }}>➕</span> INPUT DATA SPJ BARU
        </button>
      </div>

      <div className="row g-3 mb-4 text-center">
        <div className="col-md-3">
          <div className="card-stat stat-main" onClick={() => goToFilter('ALL')}>
            <h6>TOTAL REGISTER</h6><h2>{stats.total}</h2>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card-stat stat-belum" onClick={() => goToFilter('belum proses')}>
            <h6>BELUM PROSES</h6><h2>{stats.belum}</h2>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card-stat stat-acc" onClick={() => goToFilter('acc')}>
            <h6>ACC</h6><h2>{stats.acc}</h2>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card-stat stat-revisi" onClick={() => goToFilter('revisi')}>
            <h6>PERLU REVISI</h6><h2>{stats.revisi}</h2>
          </div>
        </div>
      </div>

      <div className="bagian-grid">
        {BAGIAN_LIST.map((b) => (
          <div className="bagian-card" key={b} onClick={() => goToBagian(b)}>
            <div className="title-bg">
              {b} <span className="float-end text-muted">({statsBagian[b] || 0})</span>
            </div>
            <div className="detail-row">
              <span style={{ color: '#64748b' }}>Perjalanan Dinas</span>
              <span className="text-dark">{statsKategori[b]?.dinas ?? 0}</span>
            </div>
            <div className="detail-row">
              <span style={{ color: '#64748b' }}>Belanja Langsung</span>
              <span className="text-dark">{statsKategori[b]?.belanja ?? 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
