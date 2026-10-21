import { useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { BAGIAN_LIST, KATEGORI_LIST, type Spj, type SpjInput, type Status } from '../types';
import { formatRibuan, formatRp, onlyDigits, titleCase, todayLocal } from '../utils/format';
import { showToast } from '../lib/alert';

interface Props {
  editing: Spj | null;
  namaHistory: string[];
  onSubmit: (input: SpjInput) => Promise<void>;
  onCancel: () => void;
}

interface Row {
  key: number;
  nama: string;
  nominal: string; // sudah berformat ribuan
}

export default function SpjForm({ editing, namaHistory, onSubmit, onCancel }: Props) {
  const keyRef = useRef(0);
  const nextKey = () => ++keyRef.current;

  const [bagian, setBagian] = useState(editing?.bagian ?? '');
  const [kategori, setKategori] = useState(editing?.kategori ?? '');
  const [status, setStatus] = useState<string>(editing?.status ?? '');
  const [uraian, setUraian] = useState(editing?.uraian ?? '');
  const [tglMasuk, setTglMasuk] = useState(editing?.tglMasuk ?? '');
  const [tglKeluar, setTglKeluar] = useState(editing?.tglKeluar ?? '');
  const [tglBerkas, setTglBerkas] = useState(editing?.tglBerkas ?? '');
  const [tglBayar, setTglBayar] = useState(editing?.tglBayar ?? '');
  const [ket, setKet] = useState(editing?.ket ?? '');
  const [rows, setRows] = useState<Row[]>(() =>
    editing && editing.pegawai.length > 0
      ? editing.pegawai.map((p) => ({ key: nextKey(), nama: p.nama, nominal: formatRibuan(String(p.nominal)) }))
      : [{ key: nextKey(), nama: '', nominal: '' }],
  );

  const total = rows.reduce((a, r) => a + Number(onlyDigits(r.nominal) || 0), 0);

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => setRows((rs) => [...rs, { key: nextKey(), nama: '', nominal: '' }]);

  const removeRow = (key: number) => {
    if (rows.length <= 1) return void showToast('Peringatan', 'Minimal harus ada 1 pegawai!', 'warning');
    setRows((rs) => rs.filter((r) => r.key !== key));
  };

  // Klik field tanggal kosong -> isi hari ini (perilaku sama dengan versi lama)
  const fillToday = (setter: (v: string) => void) => (e: MouseEvent<HTMLInputElement>) => {
    if (!e.currentTarget.value) setter(todayLocal());
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const pegawai = rows
      .map((r) => ({ nama: titleCase(r.nama.trim()), digits: onlyDigits(r.nominal) }))
      .filter((r) => r.nama && r.digits !== '')
      .map((r) => ({ nama: r.nama, nominal: Number(r.digits) }));

    if (pegawai.length === 0) {
      return void showToast('Peringatan', 'Isi minimal 1 pegawai lengkap dengan nama dan nominal.', 'warning');
    }

    await onSubmit({
      id: editing?.id,
      no: editing?.no ?? '',
      bagian,
      kategori,
      uraian: uraian.trim(),
      status: (status || null) as Status,
      tglMasuk, tglKeluar, tglBerkas, tglBayar,
      ket: ket.trim(),
      pegawai,
    });
  }

  return (
    <div className="container-fluid">
      <div className="form-box">
        <h5 className="mb-4 border-bottom pb-3 fw-bold" style={{ color: '#1e293b' }}>Form Penginputan Data SPJ</h5>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-bold">Bagian</label>
              <select className="form-select bg-light" value={bagian} required onChange={(e) => setBagian(e.target.value)}>
                <option value="">-- Pilih Bagian --</option>
                {BAGIAN_LIST.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold" style={{ color: '#059669' }}>Kategori</label>
              <select className="form-select bg-light" value={kategori} required onChange={(e) => setKategori(e.target.value)}>
                <option value="">-- Pilih Kategori --</option>
                {KATEGORI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
                {/* kategori lama di luar daftar tetap bisa tampil saat edit */}
                {kategori && !(KATEGORI_LIST as readonly string[]).includes(kategori) && (
                  <option value={kategori}>{kategori}</option>
                )}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold" style={{ color: '#dc2626' }}>Status Verifikasi</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">-- Belum Diproses --</option>
                <option value="ACC">ACC</option>
                <option value="REVISI">Revisi</option>
              </select>
            </div>

            <div className="col-md-12">
              <label className="form-label fw-bold">Uraian SPJ</label>
              <textarea className="form-control" rows={2} value={uraian} required
                placeholder="Keterangan uraian kegiatan/SPJ..." onChange={(e) => setUraian(e.target.value)} />
            </div>

            <div className="col-md-12 my-2">
              <label className="form-label fw-bold" style={{ color: '#4f46e5' }}>Daftar Pegawai & Rincian Nominal</label>
              <div className="p-3 border rounded-3 bg-light">
                <div>
                  {rows.map((r) => (
                    <div key={r.key} className="d-flex gap-2 mb-2 align-items-center bg-white p-2 rounded-2 border">
                      <div className="flex-grow-1">
                        <input type="text" className="form-control border-0" placeholder="Nama Pegawai"
                          value={r.nama} required autoComplete="off" list="listNamaHistory"
                          onChange={(e) => updateRow(r.key, { nama: e.target.value })} />
                      </div>
                      <div style={{ width: 200 }}>
                        <input type="text" className="form-control border-0" placeholder="Nominal (Rp)"
                          value={r.nominal} required inputMode="numeric"
                          onChange={(e) => updateRow(r.key, { nominal: formatRibuan(e.target.value) })} />
                      </div>
                      <div>
                        <button type="button" className="btn btn-outline-danger btn-sm px-3" onClick={() => removeRow(r.key)}>X</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-sm mt-2 fw-bold"
                  style={{ backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }} onClick={addRow}>
                  ➕ Tambah Pegawai
                </button>
                <div className="mt-3 text-end fw-bold"
                  style={{ fontSize: '1.15rem', color: '#059669', borderTop: '1px dashed #cbd5e0', paddingTop: 10 }}>
                  Total Keseluruhan: <span style={{ color: '#1f2937' }}>Rp</span> <span>{formatRp(total)}</span>
                </div>
                <datalist id="listNamaHistory">
                  {namaHistory.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-bold text-secondary">Tgl Masuk</label>
              <input type="date" className="form-control" value={tglMasuk}
                onClick={fillToday(setTglMasuk)} onChange={(e) => setTglMasuk(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-secondary">Tgl Keluar</label>
              <input type="date" className="form-control" value={tglKeluar}
                onClick={fillToday(setTglKeluar)} onChange={(e) => setTglKeluar(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-secondary">Tgl Berkas Lkp</label>
              <input type="date" className="form-control" value={tglBerkas}
                onClick={fillToday(setTglBerkas)} onChange={(e) => setTglBerkas(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-secondary">Tgl Bayar/ SPM</label>
              <input type="date" className="form-control" value={tglBayar}
                onClick={fillToday(setTglBayar)} onChange={(e) => setTglBayar(e.target.value)} />
            </div>

            <div className="col-md-12">
              <label className="form-label fw-bold text-secondary">Catatan Tambahan</label>
              <textarea className="form-control" rows={2} value={ket}
                placeholder="Catatan tambahan..." onChange={(e) => setKet(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 d-flex gap-2">
            <button type="submit" className="btn fw-bold py-2 flex-grow-1"
              style={{ backgroundColor: '#4f46e5', color: 'white', borderRadius: 8 }}>
              {editing ? 'UPDATE DATA' : 'SIMPAN DATA SPJ'}
            </button>
            <button type="button" className="btn btn-light border py-2 px-4 fw-bold text-secondary"
              style={{ borderRadius: 8 }} onClick={onCancel}>
              BATAL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
