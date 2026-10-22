import React, { useMemo, useState } from 'react';
import {
  BAGIAN_CLASS,
  BAGIAN_LIST,
  DEFAULT_FILTERS,
  KATEGORI_LIST,
  type DateField,
  type Filters,
  type Spj,
} from '../types';
import { getFilteredData } from '../utils/filter';
import { formatRp, formatTanggalIndo, pegawaiList } from '../utils/format';
import {
  IconSearch,
  IconExcel,
  IconPdf,
  IconEdit,
  IconPrint,
  IconTrash,
  IconFileText,
  IconCalendar,
  IconClose,
} from './Icons';

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
  if (status === 'ACC') {
    return (
      <span className="status-pill status-pill-acc">
        <span className="status-dot-sm" /> ACC
      </span>
    );
  }
  if (status === 'REVISI') {
    return (
      <span className="status-pill status-pill-revisi">
        <span className="status-dot-sm" /> Revisi
      </span>
    );
  }
  return (
    <span className="status-pill status-pill-proses">
      <span className="status-dot-sm" /> Proses
    </span>
  );
}

const INITIAL_COL_WIDTHS: Record<string, number> = {
  no: 50,
  aksi: 96,
  bagian: 130,
  kategori: 140,
  uraian: 400,
  nama: 190,
  nomList: 130,
  nominal: 140,
  status: 120,
  tglMasuk: 125,
  tglKeluar: 125,
  tglBerkas: 125,
  tglBayar: 125,
  ket: 320,
};

export default function Register({
  list,
  filters,
  setFilters,
  onEdit,
  onDelete,
  onPrint,
  onExcel,
  onPdf,
}: Props) {
  const data = useMemo(() => getFilteredData(list, filters), [list, filters]);
  const patch = (p: Partial<Filters>) => setFilters({ ...filters, ...p });
  const dateActive = Boolean(filters.dateFrom || filters.dateTo);

  // Lebar kolom yang dapat disesuaikan (resizable)
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('spj_table_col_widths');
      return saved ? JSON.parse(saved) : INITIAL_COL_WIDTHS;
    } catch {
      return INITIAL_COL_WIDTHS;
    }
  });

  const saveWidths = (widths: Record<string, number>) => {
    setColWidths(widths);
    try {
      localStorage.setItem('spj_table_col_widths', JSON.stringify(widths));
    } catch {}
  };

  const resetColWidths = () => {
    saveWidths(INITIAL_COL_WIDTHS);
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startX = clientX;
    const startWidth = colWidths[colKey] || 120;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX =
        'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const newWidth = Math.max(45, startWidth + (currentX - startX));
      setColWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        try {
          localStorage.setItem('spj_table_col_widths', JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const doSort = (key: string) => {
    if (filters.sortKey === key) {
      patch({ sortAsc: !filters.sortAsc });
    } else {
      patch({ sortKey: key, sortAsc: true });
    }
  };

  const getSortIcon = (k: string) => {
    if (filters.sortKey !== k) return '↕';
    return filters.sortAsc ? '↑' : '↓';
  };

  return (
    <div className="register-container">
      {/* Modern Filter Card */}
      <div className="table-filter-card">
        {/* Row 1: Bagian Pills */}
        <div className="filter-row-group">
          <span className="filter-row-label">Bagian:</span>
          <div className="filter-buttons-scroll">
            <button
              type="button"
              className={`pill-filter-btn ${filters.bagian === 'ALL' ? 'active' : ''}`}
              onClick={() => patch({ bagian: 'ALL' })}
            >
              Semua ({list.length})
            </button>
            {BAGIAN_LIST.map((b) => {
              const count = list.filter((it) => it.bagian.toUpperCase() === b).length;
              return (
                <button
                  key={b}
                  type="button"
                  className={`pill-filter-btn pill-bagian pill-${b.toLowerCase()} ${
                    filters.bagian === b ? 'active' : ''
                  }`}
                  onClick={() => patch({ bagian: b })}
                >
                  {b} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Kategori & Status Pills */}
        <div className="filter-row-group">
          <span className="filter-row-label">Kategori:</span>
          <div className="filter-buttons-scroll">
            <button
              type="button"
              className={`pill-filter-btn ${filters.kategori === 'ALL' ? 'active' : ''}`}
              onClick={() => patch({ kategori: 'ALL' })}
            >
              Semua Kategori
            </button>
            {KATEGORI_LIST.map((k) => (
              <button
                key={k}
                type="button"
                className={`pill-filter-btn ${filters.kategori === k ? 'active' : ''}`}
                onClick={() => patch({ kategori: k })}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Status Filter */}
        <div className="filter-row-group">
          <span className="filter-row-label">Status:</span>
          <div className="filter-buttons-scroll">
            <button
              type="button"
              className={`pill-filter-btn ${!filters.status || filters.status === 'ALL' ? 'active' : ''}`}
              onClick={() => patch({ status: '' })}
            >
              Semua Status
            </button>
            <button
              type="button"
              className={`pill-filter-btn ${filters.status === 'ACC' ? 'active' : ''}`}
              onClick={() => patch({ status: 'ACC' })}
            >
              ACC (Disetujui)
            </button>
            <button
              type="button"
              className={`pill-filter-btn ${filters.status === 'REVISI' ? 'active' : ''}`}
              onClick={() => patch({ status: 'REVISI' })}
            >
              Revisi
            </button>
            <button
              type="button"
              className={`pill-filter-btn ${filters.status === 'PROSES' ? 'active' : ''}`}
              onClick={() => patch({ status: 'PROSES' })}
            >
              Proses (Belum ACC)
            </button>
          </div>
        </div>

        {/* Row 4: Date Range Filter */}
        <div className="filter-row-group">
          <span className="filter-row-label">Periode:</span>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <select
              className="form-select form-select-sm"
              style={{ width: 140, borderRadius: 9999, fontSize: '0.78rem' }}
              value={filters.dateField}
              onChange={(e) => patch({ dateField: e.target.value as DateField })}
            >
              <option value="tglMasuk">Tgl Masuk</option>
              <option value="tglKeluar">Tgl Keluar</option>
              <option value="tglBerkas">Tgl Berkas</option>
              <option value="tglBayar">Tgl Bayar</option>
            </select>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 135, borderRadius: 9999, fontSize: '0.78rem' }}
              value={filters.dateFrom}
              onChange={(e) => patch({ dateFrom: e.target.value })}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>s/d</span>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 135, borderRadius: 9999, fontSize: '0.78rem' }}
              value={filters.dateTo}
              onChange={(e) => patch({ dateTo: e.target.value })}
            />
            {dateActive && (
              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ borderRadius: 9999, fontSize: '0.75rem' }}
                onClick={() => patch({ dateFrom: '', dateTo: '' })}
              >
                Hapus Tanggal
              </button>
            )}
          </div>
        </div>

        {/* Row 5: Search & Export Bar */}
        <div className="search-and-export-bar">
          <div className="search-input-wrap">
            <span className="search-icon-flat">
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              className="modern-search-input"
              placeholder="Cari uraian, nama pegawai/rekanan, no berkas, catatan..."
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
            />
            {filters.search && (
              <button
                type="button"
                className="btn-search-reset"
                onClick={() => patch({ search: '' })}
                title="Reset pencarian"
                aria-label="Reset pencarian"
              >
                <IconClose size={14} />
              </button>
            )}
          </div>

          <div className="export-actions">
            <span className="data-counter-badge">
              <strong>{data.length}</strong> dari {list.length} data
            </span>
            <button
              type="button"
              className="btn-export-excel"
              onClick={() => onExcel(data)}
              title="Unduh data terfilter ke format Microsoft Excel (.xlsx)"
            >
              <IconExcel size={15} />
              <span>Excel</span>
            </button>
            <button
              type="button"
              className="btn-export-pdf"
              onClick={() => onPdf(data)}
              title="Unduh rekap berkas terfilter ke format PDF"
            >
              <IconPdf size={15} />
              <span>PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-none d-md-inline-flex align-items-center gap-1"
              style={{ borderRadius: 9999, fontSize: '0.75rem', padding: '7px 12px' }}
              onClick={resetColWidths}
              title="Reset lebar kolom tabel ke default"
            >
              <span>Reset Lebar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Sticky Table Card */}
      <div className="modern-table-card">
        <div className="table-responsive-tip d-md-none">
          <IconCalendar size={13} />
          <span>Geser tabel ke samping untuk melihat kolom lengkap</span>
        </div>

        <div className="table-sticky-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th
                  style={{ width: colWidths.no, minWidth: colWidths.no }}
                  className="th-sticky text-center"
                >
                  No
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'no')}
                    onTouchStart={(e) => handleResizeStart(e, 'no')}
                  />
                </th>
                <th
                  style={{ width: colWidths.aksi, minWidth: colWidths.aksi }}
                  className="th-sticky text-center"
                >
                  Aksi
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'aksi')}
                    onTouchStart={(e) => handleResizeStart(e, 'aksi')}
                  />
                </th>
                <th
                  style={{ width: colWidths.bagian, minWidth: colWidths.bagian }}
                  className="th-sticky sortable"
                  onClick={() => doSort('bagian')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Bagian</span>
                    <span className="sort-indicator">{getSortIcon('bagian')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'bagian')}
                    onTouchStart={(e) => handleResizeStart(e, 'bagian')}
                  />
                </th>
                <th
                  style={{ width: colWidths.kategori, minWidth: colWidths.kategori }}
                  className="th-sticky sortable"
                  onClick={() => doSort('kategori')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Kategori</span>
                    <span className="sort-indicator">{getSortIcon('kategori')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'kategori')}
                    onTouchStart={(e) => handleResizeStart(e, 'kategori')}
                  />
                </th>
                <th
                  style={{ width: colWidths.uraian, minWidth: colWidths.uraian }}
                  className="th-sticky sortable"
                  onClick={() => doSort('uraian')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Uraian Kegiatan</span>
                    <span className="sort-indicator">{getSortIcon('uraian')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'uraian')}
                    onTouchStart={(e) => handleResizeStart(e, 'uraian')}
                  />
                </th>
                <th
                  style={{ width: colWidths.nama, minWidth: colWidths.nama }}
                  className="th-sticky"
                >
                  <span>Nama Pegawai</span>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'nama')}
                    onTouchStart={(e) => handleResizeStart(e, 'nama')}
                  />
                </th>
                <th
                  style={{ width: colWidths.nomList, minWidth: colWidths.nomList }}
                  className="th-sticky text-end"
                >
                  <span>Nominal Satuan</span>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'nomList')}
                    onTouchStart={(e) => handleResizeStart(e, 'nomList')}
                  />
                </th>
                <th
                  style={{ width: colWidths.nominal, minWidth: colWidths.nominal }}
                  className="th-sticky sortable text-end"
                  onClick={() => doSort('nominal')}
                >
                  <div className="d-flex align-items-center justify-content-end gap-1">
                    <span>Total (Rp)</span>
                    <span className="sort-indicator">{getSortIcon('nominal')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'nominal')}
                    onTouchStart={(e) => handleResizeStart(e, 'nominal')}
                  />
                </th>
                <th
                  style={{ width: colWidths.status, minWidth: colWidths.status }}
                  className="th-sticky sortable"
                  onClick={() => doSort('status')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Status</span>
                    <span className="sort-indicator">{getSortIcon('status')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'status')}
                    onTouchStart={(e) => handleResizeStart(e, 'status')}
                  />
                </th>
                <th
                  style={{ width: colWidths.tglMasuk, minWidth: colWidths.tglMasuk }}
                  className="th-sticky sortable"
                  onClick={() => doSort('tglMasuk')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Tgl Masuk</span>
                    <span className="sort-indicator">{getSortIcon('tglMasuk')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'tglMasuk')}
                    onTouchStart={(e) => handleResizeStart(e, 'tglMasuk')}
                  />
                </th>
                <th
                  style={{ width: colWidths.tglKeluar, minWidth: colWidths.tglKeluar }}
                  className="th-sticky sortable"
                  onClick={() => doSort('tglKeluar')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Tgl Keluar</span>
                    <span className="sort-indicator">{getSortIcon('tglKeluar')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'tglKeluar')}
                    onTouchStart={(e) => handleResizeStart(e, 'tglKeluar')}
                  />
                </th>
                <th
                  style={{ width: colWidths.tglBerkas, minWidth: colWidths.tglBerkas }}
                  className="th-sticky sortable"
                  onClick={() => doSort('tglBerkas')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Tgl Berkas</span>
                    <span className="sort-indicator">{getSortIcon('tglBerkas')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'tglBerkas')}
                    onTouchStart={(e) => handleResizeStart(e, 'tglBerkas')}
                  />
                </th>
                <th
                  style={{ width: colWidths.tglBayar, minWidth: colWidths.tglBayar }}
                  className="th-sticky sortable"
                  onClick={() => doSort('tglBayar')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Tgl Bayar</span>
                    <span className="sort-indicator">{getSortIcon('tglBayar')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'tglBayar')}
                    onTouchStart={(e) => handleResizeStart(e, 'tglBayar')}
                  />
                </th>
                <th
                  style={{ width: colWidths.ket, minWidth: colWidths.ket }}
                  className="th-sticky sortable"
                  onClick={() => doSort('ket')}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Catatan Verifikator</span>
                    <span className="sort-indicator">{getSortIcon('ket')}</span>
                  </div>
                  <div
                    className="resizer-handle"
                    onMouseDown={(e) => handleResizeStart(e, 'ket')}
                    onTouchStart={(e) => handleResizeStart(e, 'ket')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const p = pegawaiList(item);
                return (
                  <tr key={item.id}>
                    <td
                      className="td-no"
                      style={{ width: colWidths.no, minWidth: colWidths.no }}
                    >
                      {index + 1}
                    </td>
                    <td
                      className="td-actions"
                      style={{ width: colWidths.aksi, minWidth: colWidths.aksi }}
                    >
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-row-action btn-row-edit"
                          onClick={() => onEdit(item)}
                          title="Edit data SPJ ini"
                        >
                          <IconEdit size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-row-action btn-row-print"
                          onClick={() => onPrint(item)}
                          title="Cetak kartu kendali SPJ sebagai berkas PNG"
                        >
                          <IconPrint size={13} />
                          <span>Kartu</span>
                        </button>
                        <button
                          type="button"
                          className="btn-row-action btn-row-del"
                          onClick={() => onDelete(item)}
                          title="Hapus data SPJ ini"
                        >
                          <IconTrash size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                    <td style={{ width: colWidths.bagian, minWidth: colWidths.bagian }}>
                      <span
                        className={`badge-bagian-modern ${
                          BAGIAN_CLASS[item.bagian.toUpperCase()] || 'bg-secondary'
                        }`}
                      >
                        {item.bagian}
                      </span>
                    </td>
                    <td
                      style={{
                        width: colWidths.kategori,
                        minWidth: colWidths.kategori,
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {item.kategori}
                    </td>
                    <td
                      className="td-uraian"
                      style={{ width: colWidths.uraian, minWidth: colWidths.uraian }}
                    >
                      {item.uraian}
                    </td>
                    <td style={{ width: colWidths.nama, minWidth: colWidths.nama }}>
                      {p.names.map((n, i) => (
                        <div
                          key={i}
                          style={
                            i > 0
                              ? { borderTop: '1px solid #f1f5f9', paddingTop: 4, marginTop: 4 }
                              : {}
                          }
                        >
                          {n}
                        </div>
                      ))}
                    </td>
                    <td
                      style={{
                        width: colWidths.nomList,
                        minWidth: colWidths.nomList,
                        textAlign: 'right',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {p.noms.map((n, i) => (
                        <div
                          key={i}
                          style={
                            i > 0
                              ? { borderTop: '1px solid #f1f5f9', paddingTop: 4, marginTop: 4 }
                              : {}
                          }
                        >
                          {n}
                        </div>
                      ))}
                    </td>
                    <td
                      className="td-total"
                      style={{ width: colWidths.nominal, minWidth: colWidths.nominal }}
                    >
                      Rp {formatRp(item.nominal || 0)}
                    </td>
                    <td style={{ width: colWidths.status, minWidth: colWidths.status }}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td
                      style={{
                        width: colWidths.tglMasuk,
                        minWidth: colWidths.tglMasuk,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTanggalIndo(item.tglMasuk)}
                    </td>
                    <td
                      style={{
                        width: colWidths.tglKeluar,
                        minWidth: colWidths.tglKeluar,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTanggalIndo(item.tglKeluar)}
                    </td>
                    <td
                      style={{
                        width: colWidths.tglBerkas,
                        minWidth: colWidths.tglBerkas,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTanggalIndo(item.tglBerkas)}
                    </td>
                    <td
                      style={{
                        width: colWidths.tglBayar,
                        minWidth: colWidths.tglBayar,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTanggalIndo(item.tglBayar)}
                    </td>
                    {/* Kolom Catatan menyesuaikan format teks multiline / enter */}
                    <td
                      className="td-catatan"
                      style={{ width: colWidths.ket, minWidth: colWidths.ket }}
                    >
                      {item.ket ? item.ket : '-'}
                    </td>
                  </tr>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                      <IconFileText size={36} />
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Tidak ada data SPJ yang cocok
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Coba sesuaikan kata kunci pencarian atau reset filter bagian dan tanggal.
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark mt-3"
                      style={{ borderRadius: 9999, padding: '6px 16px', fontSize: '0.78rem' }}
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                    >
                      Reset Semua Filter
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
