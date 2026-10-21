import { useMemo } from 'react';
import { BAGIAN_CLASS, BAGIAN_LIST, DEFAULT_FILTERS, KATEGORI_LIST, type DateField, type Filters, type Spj } from '../types';
import { getFilteredData } from '../utils/filter';
import { formatRp, formatTanggalIndo, pegawaiList } from '../utils/format';

interface Props {
  list: Spj[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  onEdit: (item: Spj) => void;
  onDelete: (item: Spj) => void;
  onPrint: (item: Spj) => void;
  onExcel: (data: Spj[]) => void;
  onPdf: (data: Spj[]) => void;
}

function StatusBadge({ status }: { status: Spj['status'] }) {
  if (status === 'ACC') return <span className="badge-outline-acc">ACC</span>;
  if (status === 'REVISI') return <span className="badge-outline-revisi">Revisi</span>;
  return <span className="badge-outline-proses">Proses</span>;
}

export default function Register({ list, filters, setFilters, onEdit, onDelete, onPrint, onExcel, onPdf }: Props) {
  const data = useMemo(() => getFilteredData(list, filters), [list, filters]);
  const patch = (p: Partial<Filters>) => setFilters({ ...filters, ...p });
  const dateActive = Boolean(filters.dateFrom || filters.dateTo);

  const doSort = (key: string) => {
    if (filters.sortKey === key) patch({ sortAsc: !filters.sortAsc });
    else patch({ sortKey: key, sortAsc: true });
  };

  const th = (k: string, label: string, cls: string) => (
    <th key={k} className={`${cls} sortable`} onClick={() => doSort(k)}>
      {label} <span className="sort-icon">↕</span>
    </th>
  );

  return (
    <div className="container-fluid">
      <div className="table-container">
        <div className="filter-pills d-flex flex-wrap border-bottom pb-2 mb-2">
          <span className="me-3 py-1 fw-bold text-muted" style={{ fontSize: 11 }}>PILIH BAGIAN:</span>
          <button type="button" className={`btn-filter ${filters.bagian === 'ALL' ? 'active' : ''}`} onClick={() => patch({ bagian: 'ALL' })}>
            SEMUA BAGIAN
          </button>
          {BAGIAN_LIST.map((b) => (
            <button type="button" key={b} className={`btn-filter ${filters.bagian === b ? 'active' : ''}`} onClick={() => patch({ bagian: b })}>
              {b}
            </button>
          ))}
        </div>

        <div className="filter-pills d-flex flex-wrap border-bottom pb-2 mb-3">
          <span className="me-3 py-1 fw-bold text-muted" style={{ fontSize: 11 }}>PILIH KATEGORI:</span>
          <button type="button" className={`btn-filter ${filters.kategori === 'ALL' ? 'active' : ''}`} onClick={() => patch({ kategori: 'ALL' })}>
            SEMUA KATEGORI
          </button>
          {KATEGORI_LIST.map((k) => (
            <button type="button" key={k} className={`btn-filter ${filters.kategori === k ? 'active' : ''}`} onClick={() => patch({ kategori: k })}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="date-filter-bar">
            <span className="me-1 py-1 fw-bold text-muted" style={{ fontSize: 11 }}>FILTER TANGGAL:</span>
            <select className={`form-select form-select-sm ${dateActive ? 'date-filter-active' : ''}`} style={{ width: 180 }}
              value={filters.dateField} onChange={(e) => patch({ dateField: e.target.value as DateField })}>
              <option value="tglMasuk">Tgl Masuk</option>
              <option value="tglKeluar">Tgl Keluar</option>
              <option value="tglBerkas">Tgl Berkas Lengkap</option>
              <option value="tglBayar">Tgl Bayar/ SPM</option>
            </select>
            <input type="date" className="form-control form-control-sm" style={{ width: 150 }}
              value={filters.dateFrom} onChange={(e) => patch({ dateFrom: e.target.value })} />
            <span className="text-muted fw-bold" style={{ fontSize: 11 }}>s/d</span>
            <input type="date" className="form-control form-control-sm" style={{ width: 150 }}
              value={filters.dateTo} onChange={(e) => patch({ dateTo: e.target.value })} />
            <button type="button" className="btn-reset-date"
              onClick={() => patch({ dateFrom: '', dateTo: '', dateField: DEFAULT_FILTERS.dateField })}>
              ✕ Reset Tanggal
            </button>
          </div>
        </div>

        <div className="row mb-3 align-items-center">
          <div className="col-md-5">
            <input type="text" className="form-control shadow-sm" style={{ borderRadius: 8 }}
              placeholder="Cari kata kunci..." value={filters.search} onChange={(e) => patch({ search: e.target.value })} />
          </div>
          <div className="col-md-7 text-end">
            <div className="btn-group shadow-sm" style={{ borderRadius: 8, overflow: 'hidden' }}>
              <button type="button" className="btn btn-success fw-bold" style={{ fontSize: 11 }} onClick={() => onExcel(data)}>📊 EXCEL</button>
              <button type="button" className="btn btn-danger fw-bold" style={{ fontSize: 11 }} onClick={() => onPdf(data)}>📑 PDF</button>
            </div>
            <button type="button" className="btn btn-light border ms-2 fw-bold text-secondary" style={{ fontSize: 11, borderRadius: 8 }}>
              ↔ Geser tabel | Klik judul untuk urutkan
            </button>
          </div>
        </div>

        <table className="table align-middle">
          <thead>
            <tr>
              {th('no', 'No', 'col-no')}
              <th className="col-aksi">Aksi</th>
              {th('bagian', 'Bagian', 'col-bagian')}
              {th('kategori', 'Kategori', 'col-kategori')}
              <th className="col-uraian">Uraian</th>
              {th('nama', 'Daftar Pegawai', 'col-pegawai')}
              {th('nomList', 'Rincian Nominal', 'col-rincian')}
              {th('nominal', 'Total Nominal', 'col-total')}
              {th('status', 'Status', 'col-status')}
              {th('tglMasuk', 'Tgl Masuk', 'col-tgl')}
              {th('tglKeluar', 'Tgl Keluar', 'col-tgl')}
              {th('tglBerkas', 'Tgl Berkas', 'col-tgl')}
              {th('tglBayar', 'Tgl Bayar/ SPM', 'col-tgl')}
              <th className="col-catatan">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const p = pegawaiList(item);
              return (
                <tr key={item.id}>
                  <td className="col-no fw-bold text-muted">{index + 1}</td>
                  <td className="col-aksi">
                    <button type="button" className="btn-edit-row" onClick={() => onEdit(item)}>Edit</button><br />
                    <button type="button" className="btn-hapus-row" onClick={() => onDelete(item)}>Hapus</button><br />
                    <button type="button" className="btn-cetak-row" onClick={() => onPrint(item)}>🖨 Kartu</button>
                  </td>
                  <td className="col-bagian">
                    <span className={`badge-bagian ${BAGIAN_CLASS[item.bagian.toUpperCase()] || 'bg-secondary'}`}>{item.bagian}</span>
                  </td>
                  <td className="col-kategori text-secondary">{item.kategori}</td>
                  <td className="col-uraian">{item.uraian}</td>
                  <td className="col-pegawai text-dark">
                    {p.names.map((n, i) => (<div key={i}>{i > 0 && <hr className="hr-item" />}{n}</div>))}
                  </td>
                  <td className="col-rincian text-muted">
                    {p.noms.map((n, i) => (<div key={i}>{i > 0 && <hr className="hr-item" />}{n}</div>))}
                  </td>
                  <td className="col-total">Rp {formatRp(item.nominal || 0)}</td>
                  <td className="col-status"><StatusBadge status={item.status} /></td>
                  <td className="col-tgl text-secondary">{formatTanggalIndo(item.tglMasuk)}</td>
                  <td className="col-tgl text-secondary">{formatTanggalIndo(item.tglKeluar)}</td>
                  <td className="col-tgl text-secondary">{formatTanggalIndo(item.tglBerkas)}</td>
                  <td className="col-tgl text-secondary">{formatTanggalIndo(item.tglBayar)}</td>
                  <td className="col-catatan text-secondary">{item.ket}</td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center text-muted py-5">Tidak ada data yang cocok dengan filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
