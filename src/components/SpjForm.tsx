import { useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { BAGIAN_LIST, KATEGORI_LIST, type Spj, type SpjInput, type Status } from '../types';
import { formatRibuan, formatRp, onlyDigits, titleCase, todayLocal } from '../utils/format';
import { showToast } from '../lib/alert';
import {
  IconPlus,
  IconTrash,
  IconCalendar,
  IconCheckCircle,
  IconFileText,
} from './Icons';

interface Props {
  editing: Spj | null;
  namaHistory: string[];
  onSubmit: (input: SpjInput) => Promise<void>;
  onCancel: () => void;
}

interface Row {
  key: number;
  nama: string;
  nominal: string;
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
      ? editing.pegawai.map((p) => ({
          key: nextKey(),
          nama: p.nama,
          nominal: formatRibuan(String(p.nominal)),
        }))
      : [{ key: nextKey(), nama: '', nominal: '' }],
  );

  const total = rows.reduce((a, r) => a + Number(onlyDigits(r.nominal) || 0), 0);

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => setRows((rs) => [...rs, { key: nextKey(), nama: '', nominal: '' }]);

  const removeRow = (key: number) => {
    if (rows.length <= 1)
      return void showToast('Peringatan', 'Minimal harus ada 1 pegawai!', 'warning');
    setRows((rs) => rs.filter((r) => r.key !== key));
  };

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
      return void showToast(
        'Peringatan',
        'Isi minimal 1 pegawai lengkap dengan nama dan nominal.',
        'warning',
      );
    }

    await onSubmit({
      id: editing?.id,
      no: editing?.no ?? '',
      bagian,
      kategori,
      uraian: uraian.trim(),
      status: (status || null) as Status,
      tglMasuk,
      tglKeluar,
      tglBerkas,
      tglBayar,
      ket: ket.trim(),
      pegawai,
    });
  }

  return (
    <div className="modern-form-container">
      <div className="form-card-wrap">
        <div className="form-header-group d-flex justify-content-between align-items-center">
          <div>
            <h2 className="form-main-title">
              {editing ? 'Edit Berkas SPJ' : 'Formulir Input SPJ Baru'}
            </h2>
            <p className="form-main-desc">
              Setiap kelompok data dibedakan dengan aksen warna khusus untuk kemudahan verifikasi.
            </p>
          </div>
          {editing && (
            <span
              className="badge bg-light text-dark border px-3 py-2"
              style={{ borderRadius: 9999, fontSize: '0.8rem', fontWeight: 700 }}
            >
              No: {editing.no || 'SPJ-' + editing.id.slice(0, 6)}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: Identitas Berkas (Aksen Biru) */}
          <div className="form-section-block form-section-blue">
            <div className="form-section-header">
              <h3 className="form-section-title">
                <IconFileText size={18} color="#2563eb" />
                <span>1. Identitas Berkas &amp; Unit Kerja</span>
              </h3>
              <span className="form-section-badge">Wajib Diisi</span>
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label-modern label-blue">
                  Bagian / Unit Kerja <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select-modern input-blue"
                  value={bagian}
                  required
                  onChange={(e) => setBagian(e.target.value)}
                >
                  <option value="">-- Pilih Bagian --</option>
                  {BAGIAN_LIST.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label-modern label-blue">
                  Kategori SPJ <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select-modern input-blue"
                  value={kategori}
                  required
                  onChange={(e) => setKategori(e.target.value)}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {KATEGORI_LIST.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                  {kategori && !(KATEGORI_LIST as readonly string[]).includes(kategori) && (
                    <option value={kategori}>{kategori}</option>
                  )}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label-modern label-blue">
                  Status Verifikasi
                </label>
                <select
                  className="form-select-modern input-blue"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">-- Belum Diproses (Proses) --</option>
                  <option value="ACC">Disetujui (ACC)</option>
                  <option value="REVISI">Perlu Revisi (Revisi)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Uraian Kegiatan (Aksen Ungu / Violet) */}
          <div className="form-section-block form-section-violet">
            <div className="form-section-header">
              <h3 className="form-section-title">
                <IconFileText size={18} color="#7c3aed" />
                <span>2. Uraian Kegiatan / SPJ</span>
              </h3>
              <span className="form-section-badge">Deskripsi Kegiatan</span>
            </div>

            <div>
              <label className="form-label-modern label-violet">
                Keterangan Uraian Lengkap <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-textarea-modern input-violet"
                rows={3}
                value={uraian}
                required
                placeholder="Tuliskan uraian kegiatan, keperluan belanja barang/jasa, atau maksud perjalanan dinas..."
                onChange={(e) => setUraian(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 3: Pegawai & Nominal (Aksen Hijau Zamrud) */}
          <div className="form-section-block form-section-emerald">
            <div className="form-section-header">
              <h3 className="form-section-title">
                <IconCheckCircle size={18} color="#059669" />
                <span>3. Daftar Pegawai &amp; Rincian Nominal Biaya</span>
              </h3>
              <span className="form-section-badge">Rincian Anggaran</span>
            </div>

            <div className="pegawai-box-modern">
              {rows.map((r) => (
                <div key={r.key} className="pegawai-row-modern">
                  <div className="pegawai-field-grow">
                    <label className="d-md-none form-label-sub">Nama Pegawai / Rekanan:</label>
                    <input
                      type="text"
                      className="form-control border-0 bg-transparent px-2 shadow-none"
                      placeholder="Nama Pegawai / Rekanan Penerima"
                      value={r.nama}
                      required
                      autoComplete="off"
                      list="listNamaHistory"
                      style={{ fontSize: '0.88rem', fontWeight: 600 }}
                      onChange={(e) => updateRow(r.key, { nama: e.target.value })}
                    />
                  </div>
                  <div className="pegawai-field-nominal">
                    <label className="d-md-none form-label-sub">Nominal (Rp):</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white border-0 text-muted fw-bold">
                        Rp
                      </span>
                      <input
                        type="text"
                        className="form-control border-0 bg-transparent px-1 shadow-none fw-bold"
                        placeholder="0"
                        value={r.nominal}
                        required
                        inputMode="numeric"
                        style={{ fontSize: '0.88rem', color: '#047857' }}
                        onChange={(e) =>
                          updateRow(r.key, { nominal: formatRibuan(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-row"
                    title="Hapus baris pegawai ini"
                    onClick={() => removeRow(r.key)}
                  >
                    <IconTrash size={14} color="#dc2626" />
                  </button>
                </div>
              ))}

              <div className="d-flex justify-content-between align-items-center mt-3">
                <button type="button" className="btn-add-pegawai" onClick={addRow}>
                  <IconPlus size={14} />
                  <span>Tambah Pegawai / Baris</span>
                </button>
              </div>

              <div className="total-display-bar">
                <span className="total-display-label">Total Nominal Keseluruhan:</span>
                <span className="total-display-val">Rp {formatRp(total)}</span>
              </div>

              <datalist id="listNamaHistory">
                {namaHistory.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>

          {/* SECTION 4: Alur Tanggal Berkas (Aksen Kuning Emas / Amber) */}
          <div className="form-section-block form-section-amber">
            <div className="form-section-header">
              <h3 className="form-section-title">
                <IconCalendar size={18} color="#d97706" />
                <span>4. Alur Tanggal Verifikasi Berkas SPJ</span>
              </h3>
              <span className="form-section-badge">Klik kolom untuk tanggal hari ini</span>
            </div>

            <div className="row g-3">
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label-modern label-amber">Tgl Masuk Berkas</label>
                <input
                  type="date"
                  className="form-input-modern input-amber"
                  value={tglMasuk}
                  onClick={fillToday(setTglMasuk)}
                  onChange={(e) => setTglMasuk(e.target.value)}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label-modern label-amber">Tgl Perbaikan / Keluar</label>
                <input
                  type="date"
                  className="form-input-modern input-amber"
                  value={tglKeluar}
                  onClick={fillToday(setTglKeluar)}
                  onChange={(e) => setTglKeluar(e.target.value)}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label-modern label-amber">Tgl Berkas Lengkap</label>
                <input
                  type="date"
                  className="form-input-modern input-amber"
                  value={tglBerkas}
                  onClick={fillToday(setTglBerkas)}
                  onChange={(e) => setTglBerkas(e.target.value)}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label-modern label-amber">Tgl Bayar / SPM</label>
                <input
                  type="date"
                  className="form-input-modern input-amber"
                  value={tglBayar}
                  onClick={fillToday(setTglBayar)}
                  onChange={(e) => setTglBayar(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Catatan Verifikator (Aksen Merah Mawar / Rose) */}
          <div className="form-section-block form-section-rose">
            <div className="form-section-header">
              <h3 className="form-section-title">
                <IconFileText size={18} color="#e11d48" />
                <span>5. Catatan Verifikator &amp; Keterangan Tambahan</span>
              </h3>
              <span className="form-section-badge">Mendukung Multiline / Baris Baru</span>
            </div>

            <div>
              <label className="form-label-modern label-rose">
                Catatan Berkas (Tekan Enter untuk baris baru)
              </label>
              <textarea
                className="form-textarea-modern input-rose"
                rows={3}
                value={ket}
                placeholder="Contoh:&#10;- Kuitansi nomor 12 belum dilampirkan&#10;- Perlu paraf kasubag&#10;- Berkas siap diajukan SPM"
                onChange={(e) => setKet(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions-wrap">
            <button type="submit" className="btn-dark-pill btn-submit-form">
              <IconCheckCircle size={18} color="#ffffff" />
              <span>{editing ? 'Update Data SPJ' : 'Simpan Data SPJ Baru'}</span>
            </button>
            <button type="button" className="btn-cancel-form" onClick={onCancel}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
