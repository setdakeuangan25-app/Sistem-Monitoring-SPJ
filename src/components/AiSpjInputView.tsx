import React, { useState, useRef, useEffect } from 'react';
import { BAGIAN_LIST, KATEGORI_LIST, type SpjInput, type Status } from '../types';
import { formatRibuan, formatRp, onlyDigits, titleCase, todayLocal } from '../utils/format';
import { showToast } from '../lib/alert';
import {
  IconSparkles,
  IconMic,
  IconCamera,
  IconUpload,
  IconClose,
  IconSpinner,
  IconCheck,
  IconPlus,
  IconTrash,
  IconFileText,
  IconCalendar,
  IconAudioWave,
  IconEdit,
  IconChevronRight,
} from './Icons';

export interface ExtractedSpjData {
  bagian: string;
  kategori: string;
  uraian: string;
  pegawai: { nama: string; nominal: number }[];
  tglMasuk: string;
  status?: string;
  ket?: string;
  confidenceNote?: string;
}

interface Props {
  onSaveSpj: (input: SpjInput) => Promise<void>;
  onTransferToForm: (draft: ExtractedSpjData) => void;
  onGoToManualForm: () => void;
  namaHistory: string[];
}

type InputTab = 'photo' | 'voice' | 'text';

interface PegawaiRow {
  key: number;
  nama: string;
  nominal: string;
}

export default function AiSpjInputView({
  onSaveSpj,
  onTransferToForm,
  onGoToManualForm,
  namaHistory,
}: Props) {
  const [activeTab, setActiveTab] = useState<InputTab>('photo');

  // Input states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // Analysis & Loading
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Draft review form state
  const [hasExtracted, setHasExtracted] = useState(false);
  const [draftBagian, setDraftBagian] = useState<string>('UMUM');
  const [draftKategori, setDraftKategori] = useState<string>('Belanja Langsung');
  const [draftStatus, setDraftStatus] = useState<string>('ACC');
  const [draftUraian, setDraftUraian] = useState<string>('');
  const [draftTglMasuk, setDraftTglMasuk] = useState<string>(todayLocal());
  const [draftKet, setDraftKet] = useState<string>('');
  const [confidenceNote, setConfidenceNote] = useState<string>('');

  const keyRef = useRef(100);
  const nextKey = () => ++keyRef.current;
  const [pegawaiRows, setPegawaiRows] = useState<PegawaiRow[]>([
    { key: 1, nama: '', nominal: '' },
  ]);

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [audioUrl, imagePreview]);

  // Image handlers
  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Peringatan', 'Silakan pilih berkas gambar kuitansi/dokumen (JPG, PNG, WebP).', 'warning');
      return;
    }
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
    setAnalysisError(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio file upload handler (alternative to live microphone)
  const handleAudioFileSelect = (file: File | null) => {
    if (!file) return;
    setAudioBlob(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setAnalysisError(null);
    setMicPermissionDenied(false);
    showToast('Audio Dipilih', `Berkas suara "${file.name}" siap dianalisis.`, 'success');
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      setAnalysisError(null);
      setMicPermissionDenied(false);

      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicPermissionDenied(true);
        setAnalysisError(
          'Perekaman mikrofon langsung dibatasi oleh izin peramban/iframe. Anda dapat mengunggah berkas rekaman suara (.mp3, .m4a, .wav) menggunakan tombol di bawah, atau beralih ke Teks Ringkas.',
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlobCombined = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlobCombined);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(audioBlobCombined));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      // Gracefully handle permission denied without throwing console.error
      setMicPermissionDenied(true);
      setAnalysisError(
        'Izin akses mikrofon belum diizinkan oleh peramban. Anda dapat mengizinkannya di setelan browser, ATAU gunakan tombol "Unggah Berkas Audio" di bawah.',
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordSeconds(0);
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
  };

  // Helper to convert Blob / File to base64
  const fileToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Preset sample loader for one-click testing
  const loadPreset = (type: 'atk' | 'perjadin' | 'konsumsi') => {
    if (type === 'atk') {
      setActiveTab('text');
      setInputText(
        'SPJ Belanja Alat Tulis Kantor (ATK) dan Kertas HVS untuk Sekretariat Daerah Bagian Umum. Toko Penyedia: Toko Barata Pangkalan Bun. Rincian: Kertas HVS A4 10 rim Rp 550.000, Tinta Printer Epson 4 botol Rp 480.000, Odner & Pulpen Rp 220.000. Total kuitansi Rp 1.250.000 tanggal 14 Maret 2026. Berkas kuitansi dan nota rincian barang sudah distempel lunas.',
      );
      setAdditionalPrompt('Bagian Umum, Belanja Langsung');
    } else if (type === 'perjadin') {
      setActiveTab('text');
      setInputText(
        'Perjalanan Dinas Bagian Administrasi Pembangunan dalam rangka Koordinasi dan Konsultasi Pelaksanaan Rencana Aksi Daerah ke Bappedalitbang Provinsi Kalimantan Tengah di Palangka Raya selama 3 hari. Pelaksana tugas: 1. Ir. Bambang Hermanto nominal Rp 2.450.000, 2. Rahmat Hidayat, S.T. nominal Rp 1.850.000. Tanggal berangkat 10 Maret 2026. SPT dan SPPD lengkap.',
      );
      setAdditionalPrompt('Bagian Administrasi Pembangunan, Perjalanan Dinas');
    } else {
      setActiveTab('text');
      setInputText(
        'Kuitansi Pembayaran Konsumsi Makan Siang dan Snack Kegiatan Rapat Koordinasi Tim Penanganan Stunting Bagian Kesejahteraan Rakyat (Kesra). Rekanan Katering: RM Selera Kita. Total tagihan Rp 875.000 untuk 35 porsi rapat. Tanggal kuitansi 18 Maret 2026.',
      );
      setAdditionalPrompt('Bagian Kesejahteraan Rakyat');
    }
    showToast('Contoh Dimuat', 'Data contoh berhasil dimuat. Klik tombol "Analisis & Ekstrak Data" di bawah!', 'info');
  };

  // Submit to Gemini API
  const handleAnalyze = async () => {
    const hasPhoto = !!imageFile;
    const hasVoice = !!audioBlob;
    const hasText = !!inputText.trim();

    if (!hasPhoto && !hasVoice && !hasText) {
      setAnalysisError(
        'Mohon sertakan setidaknya satu masukan: Upload foto kuitansi, rekam suara dikte, atau ketik rincian berkas.',
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep('Menghubungkan ke Gemini AI...');

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let audioBase64: string | undefined;
      let audioMimeType: string | undefined;

      if (imageFile) {
        setAnalysisStep('Mengonversi foto kuitansi...');
        imageBase64 = await fileToBase64(imageFile);
        imageMimeType = imageFile.type || 'image/jpeg';
      }

      if (audioBlob) {
        setAnalysisStep('Mengonversi rekaman audio suara...');
        audioBase64 = await fileToBase64(audioBlob);
        audioMimeType = audioBlob.type || 'audio/webm';
      }

      setAnalysisStep('Gemini AI sedang membaca dokumen & menghitung angka...');

      // Combine text and additional prompt
      const fullText = [inputText.trim(), additionalPrompt.trim() ? `Catatan Verifikator: ${additionalPrompt.trim()}` : '']
        .filter(Boolean)
        .join('\n\n');

      const response = await fetch('/api/gemini/extract-spj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullText,
          imageBase64,
          imageMimeType,
          audioBase64,
          audioMimeType,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal mengekstrak data dari masukan.');
      }

      const raw = result.data;
      setAnalysisStep('Menyusun draf formulir SPJ...');

      // Populate draft state
      setDraftBagian(BAGIAN_LIST.includes(raw.bagian as any) ? raw.bagian : 'UMUM');
      setDraftKategori(
        KATEGORI_LIST.includes(raw.kategori as any) ? raw.kategori : 'Belanja Langsung',
      );
      setDraftStatus(raw.status || 'ACC');
      setDraftUraian(raw.uraian || '');
      setDraftTglMasuk(raw.tglMasuk || todayLocal());
      setDraftKet(raw.ket || 'Diverifikasi secara otomatis dengan AI Gemini');
      setConfidenceNote(
        raw.confidenceNote ||
          'Data berhasil diekstrak dan disesuaikan dengan struktur SPJ Sekretariat Daerah Kobar.',
      );

      // Populate pegawai rows
      if (Array.isArray(raw.pegawai) && raw.pegawai.length > 0) {
        setPegawaiRows(
          raw.pegawai.map((p: any) => ({
            key: nextKey(),
            nama: String(p.nama || 'Penerima Belanja'),
            nominal: formatRibuan(String(p.nominal || 0)),
          })),
        );
      } else {
        setPegawaiRows([{ key: nextKey(), nama: 'Penerima Belanja', nominal: '0' }]);
      }

      setHasExtracted(true);
      showToast('Ekstraksi Sukses', 'Data SPJ berhasil dianalisis oleh AI! Silakan tinjau draf di panel kanan.', 'success');
    } catch (err: any) {
      console.error('Error analyzing SPJ:', err);
      setAnalysisError(err.message || 'Terjadi kesalahan saat memproses data dengan AI.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Pegawai list operations
  const updateRow = (key: number, patch: Partial<PegawaiRow>) => {
    setPegawaiRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setPegawaiRows((rows) => [...rows, { key: nextKey(), nama: '', nominal: '' }]);
  };

  const removeRow = (key: number) => {
    if (pegawaiRows.length <= 1) {
      showToast('Peringatan', 'Minimal harus ada 1 nama pegawai/rekanan!', 'warning');
      return;
    }
    setPegawaiRows((rows) => rows.filter((r) => r.key !== key));
  };

  // Calculate live total
  const totalNominal = pegawaiRows.reduce(
    (acc, r) => acc + Number(onlyDigits(r.nominal) || 0),
    0,
  );

  // Direct save to Supabase / store
  const handleDirectSave = async () => {
    const pegawai = pegawaiRows
      .map((r) => ({ nama: titleCase(r.nama.trim()), digits: onlyDigits(r.nominal) }))
      .filter((r) => r.nama && r.digits !== '')
      .map((r) => ({ nama: r.nama, nominal: Number(r.digits) }));

    if (pegawai.length === 0) {
      showToast('Peringatan', 'Mohon isi minimal 1 penerima belanja dengan nominal valid.', 'warning');
      return;
    }

    if (!draftUraian.trim()) {
      showToast('Peringatan', 'Uraian kegiatan SPJ wajib diisi.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveSpj({
        no: '',
        bagian: draftBagian,
        kategori: draftKategori,
        uraian: draftUraian.trim(),
        status: (draftStatus || null) as Status,
        tglMasuk: draftTglMasuk,
        tglKeluar: '',
        tglBerkas: '',
        tglBayar: '',
        ket: draftKet.trim(),
        pegawai,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Transfer to full SpjForm
  const handleOpenInFullForm = () => {
    const pegawai = pegawaiRows
      .map((r) => ({ nama: titleCase(r.nama.trim()), nominal: Number(onlyDigits(r.nominal) || 0) }))
      .filter((r) => r.nama);

    onTransferToForm({
      bagian: draftBagian,
      kategori: draftKategori,
      uraian: draftUraian,
      pegawai: pegawai.length > 0 ? pegawai : [{ nama: 'Penerima Belanja', nominal: totalNominal }],
      tglMasuk: draftTglMasuk,
      status: draftStatus,
      ket: draftKet,
      confidenceNote,
    });
  };

  const handleReset = () => {
    setHasExtracted(false);
    clearImage();
    clearAudio();
    setInputText('');
    setAdditionalPrompt('');
    setAnalysisError(null);
    setPegawaiRows([{ key: nextKey(), nama: '', nominal: '' }]);
  };

  return (
    <div className="modern-form-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Action Banner matching Dashboard style */}
      <div
        className="hero-action-card mb-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 80%, #3730a3 100%)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '24px 28px',
          boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)',
        }}
      >
        <div className="hero-text">
          <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
            <span
              className="badge"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.72rem',
                letterSpacing: '0.5px',
                padding: '5px 12px',
                borderRadius: '9999px',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
              }}
            >
              <IconSparkles size={12} color="#ffffff" className="me-1 inline" />
              AI SCANNER · GEMINI 3.1
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.72rem',
                padding: '5px 12px',
                borderRadius: '9999px',
              }}
            >
              Setda Kab. Kotawaringin Barat
            </span>
          </div>

          <h3 className="hero-heading" style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0' }}>
            Input SPJ Otomatis dengan AI
          </h3>
          <p className="hero-desc" style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.84rem', margin: 0, maxWidth: '780px' }}>
            Pindai foto kuitansi/nota, rekam suara dikte verifikator, atau masukkan ringkasan berkas. AI Gemini akan membaca teks, menghitung nilai nominal, mengelompokkan Bagian, dan menyusun draf SPJ siap simpan.
          </p>
        </div>

        <div className="hero-cta-wrap mt-3 mt-sm-0 d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '0.78rem',
            }}
            onClick={() => loadPreset('atk')}
          >
            Contoh Kuitansi ATK
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '0.78rem',
            }}
            onClick={() => loadPreset('perjadin')}
          >
            Contoh Perjadin
          </button>
          <button
            type="button"
            className="btn-hero-new"
            onClick={onGoToManualForm}
            title="Buka form input manual biasa"
          >
            <IconEdit size={14} />
            <span>Form Manual</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="row g-4 align-items-stretch">
        {/* ========================================================
            LEFT COLUMN: Input & Extraction Source (45%)
            ======================================================== */}
        <div className="col-12 col-lg-5">
          <div
            className="form-card-wrap h-100 d-flex flex-column"
            style={{
              padding: '24px 22px',
              borderRadius: '22px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div className="form-header-group pb-3 mb-3 d-flex justify-content-between align-items-center">
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  1. Masukan Media SPJ
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Pilih foto kuitansi, rekam suara dikte, atau tempel teks ringkasan.
                </p>
              </div>
              <span
                className="badge"
                style={{
                  backgroundColor: '#eef2ff',
                  color: '#4f46e5',
                  border: '1px solid #c7d2fe',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  padding: '4px 10px',
                }}
              >
                Multimodal AI
              </span>
            </div>

            {/* Segmented Mode Tabs */}
            <div
              className="p-1 mb-3 rounded-2xl d-flex gap-1"
              style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}
            >
              <button
                type="button"
                className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeTab === 'photo'
                    ? 'bg-white shadow-sm font-bold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 border-0'
                }`}
                style={{ fontSize: '0.78rem' }}
                onClick={() => setActiveTab('photo')}
              >
                <IconCamera size={15} color={activeTab === 'photo' ? '#2563eb' : 'currentColor'} />
                <span>Foto Kuitansi</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeTab === 'voice'
                    ? 'bg-white shadow-sm font-bold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 border-0'
                }`}
                style={{ fontSize: '0.78rem' }}
                onClick={() => setActiveTab('voice')}
              >
                <IconMic size={15} color={activeTab === 'voice' ? '#ef4444' : 'currentColor'} />
                <span>Dikte Suara</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeTab === 'text'
                    ? 'bg-white shadow-sm font-bold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 border-0'
                }`}
                style={{ fontSize: '0.78rem' }}
                onClick={() => setActiveTab('text')}
              >
                <IconFileText size={15} color={activeTab === 'text' ? '#7c3aed' : 'currentColor'} />
                <span>Teks Ringkas</span>
              </button>
            </div>

            {/* TAB CONTENT: Photo */}
            {activeTab === 'photo' && (
              <div className="flex-fill d-flex flex-column">
                {!imagePreview ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center flex-fill min-h-[180px] bg-slate-50/60 hover:bg-blue-50/40"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-sm">
                      <IconUpload size={22} color="#2563eb" />
                    </div>
                    <span className="font-bold text-sm text-slate-800">
                      Klik untuk Pilih Foto atau Seret ke Sini
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Mendukung foto kuitansi, nota toko, bon bensin, atau dokumen dinas (JPG, PNG, WebP)
                    </span>
                    <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold">
                      <IconCamera size={12} />
                      Bisa langsung foto dengan kamera HP
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex flex-col items-center justify-center p-2 min-h-[220px]">
                    <img
                      src={imagePreview}
                      alt="Pratinjau Kuitansi"
                      className="max-h-[260px] w-auto object-contain rounded-xl"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={clearImage}
                        className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1"
                        title="Hapus foto ini"
                      >
                        <IconTrash size={13} color="#ffffff" />
                        <span>Hapus</span>
                      </button>
                    </div>
                    {imageFile && (
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{imageFile.name}</span>
                        <span>•</span>
                        <span>{(imageFile.size / 1024).toFixed(0)} KB</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Voice */}
            {activeTab === 'voice' && (
              <div className="flex-fill d-flex flex-column align-items-center justify-content-center p-3 rounded-2xl bg-slate-50 border border-slate-200 min-h-[220px]">
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleAudioFileSelect(e.target.files?.[0] || null)}
                />

                {!audioBlob ? (
                  <div className="text-center w-100 d-flex flex-column align-items-center">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 mb-2 ${
                        isRecording
                          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-4 ring-red-200'
                          : 'bg-gradient-to-tr from-rose-500 to-red-600 text-white hover:brightness-105'
                      }`}
                      title={isRecording ? 'Klik untuk berhenti merekam' : 'Klik untuk mulai rekam suara'}
                    >
                      <IconMic size={26} color="#ffffff" />
                    </button>

                    <div className="font-extrabold text-sm text-slate-800">
                      {isRecording ? 'Sedang Merekam Suara...' : 'Klik untuk Mulai Dikte Suara'}
                    </div>

                    {isRecording ? (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                        <span className="font-mono text-base font-bold text-red-600">
                          {Math.floor(recordSeconds / 60)
                            .toString()
                            .padStart(2, '0')}
                          :{(recordSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mb-0">
                        Ucapkan uraian belanja, nama penerima, nominal rupiah, dan bagian terkait.
                      </p>
                    )}

                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="mt-3 px-4 py-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition-all"
                      >
                        Selesai Merekam
                      </button>
                    ) : (
                      <div className="mt-3 pt-2 border-t border-slate-200 w-100 max-w-xs d-flex flex-column align-items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">atau tanpa mikrofon:</span>
                        <button
                          type="button"
                          onClick={() => audioFileInputRef.current?.click()}
                          className="btn btn-sm btn-light border bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded-xl d-inline-flex align-items-center gap-1.5 shadow-sm"
                        >
                          <IconUpload size={13} color="#475569" />
                          <span>Unggah Berkas Audio (.mp3, .m4a, .wav)</span>
                        </button>

                        {micPermissionDenied && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-start w-100 mt-1">
                            <span className="font-bold block mb-1">💡 Izin Mikrofon Belum Aktif</span>
                            <span>
                              Jika peramban membatasi mikrofon di iframe, Anda dapat mengunggah berkas rekaman suara secara manual di atas atau gunakan tab <b>Teks Ringkas</b>.
                            </span>
                            <div className="mt-2 text-end">
                              <button
                                type="button"
                                onClick={() => setActiveTab('text')}
                                className="px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[10px]"
                              >
                                Beralih ke Teks Ringkas ➜
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-100 d-flex flex-column align-items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                      <IconAudioWave size={22} color="#059669" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 mb-2">
                      Rekaman Suara Siap Dianalisis
                    </span>
                    {audioUrl && (
                      <audio controls src={audioUrl} className="w-100 max-w-xs mb-3 h-10" />
                    )}
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={clearAudio}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all"
                      >
                        Ganti / Rekam Ulang
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Text */}
            {activeTab === 'text' && (
              <div className="flex-fill d-flex flex-column">
                <textarea
                  className="form-textarea-modern flex-fill"
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik rincian nota atau salin teks ringkasan belanja di sini...&#10;Contoh: Belanja ATK Bagian Umum toko Barata Rp 1.250.000 tgl 14 Maret 2026 rincian kertas dan tinta."
                  style={{ minHeight: '140px', fontSize: '0.85rem' }}
                />

                <div className="mt-2 d-flex flex-wrap gap-1">
                  <span className="text-[11px] text-slate-400 font-bold me-1 align-self-center">
                    Contoh cepat:
                  </span>
                  <button
                    type="button"
                    onClick={() => loadPreset('atk')}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold border border-slate-200"
                  >
                    + Belanja ATK
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('perjadin')}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold border border-slate-200"
                  >
                    + Perjadin
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('konsumsi')}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold border border-slate-200"
                  >
                    + Konsumsi
                  </button>
                </div>
              </div>
            )}

            {/* Optional Additional Guidance Prompt */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="form-label-sub" style={{ color: 'var(--text-secondary)' }}>
                Petunjuk Tambahan untuk AI (Opsional)
              </label>
              <input
                type="text"
                className="form-input-modern py-1.5 text-xs"
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="Misal: Bagian Kesra, ada 2 orang penerima, dll."
              />
            </div>

            {/* Error Banner */}
            {analysisError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium d-flex align-items-center justify-content-between">
                <span>{analysisError}</span>
                <button
                  type="button"
                  onClick={() => setAnalysisError(null)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Extract Action Button */}
            <div className="mt-4 pt-2">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={handleAnalyze}
                className="w-100 py-3 px-4 rounded-xl text-white font-extrabold text-sm shadow-lg transition-all d-flex align-items-center justify-content-center gap-2 active:scale-98"
                style={{
                  background: isAnalyzing
                    ? '#64748b'
                    : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <IconSpinner size={18} color="#ffffff" />
                    <span>{analysisStep || 'Sedang Memproses dengan AI...'}</span>
                  </>
                ) : (
                  <>
                    <IconSparkles size={18} color="#ffffff" />
                    <span>Analisis &amp; Ekstrak Data SPJ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: Review & Form Draft (55%)
            ======================================================== */}
        <div className="col-12 col-lg-7">
          <div
            className="form-card-wrap h-100 d-flex flex-column"
            style={{
              padding: '24px 26px',
              borderRadius: '22px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div className="form-header-group pb-3 mb-3 d-flex justify-content-between align-items-center">
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  2. Draf &amp; Hasil Verifikasi SPJ
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {hasExtracted
                    ? 'Periksa dan sesuaikan data sebelum disimpan langsung ke sistem register.'
                    : 'Hasil ekstraksi AI akan muncul di panel ini setelah tombol analisis ditekan.'}
                </p>
              </div>
              <span
                className="badge"
                style={{
                  backgroundColor: hasExtracted ? '#ecfdf5' : '#f8fafc',
                  color: hasExtracted ? '#059669' : '#64748b',
                  border: `1px solid ${hasExtracted ? '#a7f3d0' : '#e2e8f0'}`,
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  padding: '4px 10px',
                }}
              >
                {hasExtracted ? 'Siap Ditinjau' : 'Menunggu Input'}
              </span>
            </div>

            {!hasExtracted ? (
              /* Empty State Placeholder */
              <div className="flex-fill d-flex flex-column align-items-center justify-content-center p-4 text-center my-auto min-h-[360px]">
                <div
                  className="w-16 h-16 rounded-3xl d-flex align-items-center justify-content-center mb-3 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5' }}
                >
                  <IconSparkles size={32} color="#4f46e5" />
                </div>
                <h5 className="font-extrabold text-slate-800 mb-1" style={{ fontSize: '1.1rem' }}>
                  Belum Ada Berkas yang Dianalisis
                </h5>
                <p className="text-slate-500 text-xs max-w-sm mb-4">
                  Unggah kuitansi foto, rekam suara verifikator, atau tempelkan nota belanja di panel sebelah kiri, lalu tekan <b>Analisis &amp; Ekstrak Data SPJ</b>.
                </p>

                <div
                  className="p-3 rounded-2xl w-100 max-w-md text-start"
                  style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Langkah Kerja AI Gemini:
                  </div>
                  <div className="d-flex align-items-center gap-2.5 mb-2 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold d-flex align-items-center justify-content-center text-[10px] shrink-0">
                      1
                    </span>
                    <span>Pilih media masukan (Foto Kuitansi, Dikte Suara, atau Teks).</span>
                  </div>
                  <div className="d-flex align-items-center gap-2.5 mb-2 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold d-flex align-items-center justify-content-center text-[10px] shrink-0">
                      2
                    </span>
                    <span>AI mengekstrak nama penerima, nominal rupiah, uraian, dan bagian.</span>
                  </div>
                  <div className="d-flex align-items-center gap-2.5 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold d-flex align-items-center justify-content-center text-[10px] shrink-0">
                      3
                    </span>
                    <span>Tinjau dan simpan langsung ke Register SPJ atau lengkapi di form.</span>
                  </div>
                </div>

                <div className="mt-4 d-flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      loadPreset('atk');
                      setTimeout(handleAnalyze, 100);
                    }}
                    className="btn btn-sm btn-outline-primary rounded-pill font-bold px-3 text-xs"
                  >
                    ⚡ Jalankan Uji Coba Otomatis (Demo)
                  </button>
                </div>
              </div>
            ) : (
              /* Extracted Review & Editor Form */
              <div className="flex-fill d-flex flex-column">
                {/* AI Summary Confidence Box */}
                {confidenceNote && (
                  <div
                    className="p-3 mb-3 rounded-2xl d-flex align-items-start gap-2.5"
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1e40af',
                    }}
                  >
                    <div className="mt-0.5">
                      <IconCheck size={16} color="#2563eb" />
                    </div>
                    <div className="flex-grow-1 text-xs">
                      <span className="font-bold block mb-0.5">Hasil Pembacaan Dokumen:</span>
                      <span className="text-blue-900">{confidenceNote}</span>
                    </div>
                  </div>
                )}

                {/* Section 1: Identitas & Klasifikasi */}
                <div className="form-section-block form-section-blue py-3 px-3.5 mb-3">
                  <div className="form-section-header mb-2.5 pb-2">
                    <h5 className="form-section-title" style={{ fontSize: '0.85rem' }}>
                      <IconFileText size={16} color="#2563eb" />
                      <span>Identitas &amp; Klasifikasi SPJ</span>
                    </h5>
                    <span className="form-section-badge">Otomatis Terisi</span>
                  </div>

                  <div className="row g-2">
                    <div className="col-12 col-sm-4">
                      <label className="form-label-modern label-blue text-xs">
                        Bagian / Unit Kerja
                      </label>
                      <select
                        className="form-select-modern input-blue py-1.5 text-xs font-semibold"
                        value={draftBagian}
                        onChange={(e) => setDraftBagian(e.target.value)}
                      >
                        {BAGIAN_LIST.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-sm-4">
                      <label className="form-label-modern label-blue text-xs">
                        Kategori SPJ
                      </label>
                      <select
                        className="form-select-modern input-blue py-1.5 text-xs font-semibold"
                        value={draftKategori}
                        onChange={(e) => setDraftKategori(e.target.value)}
                      >
                        {KATEGORI_LIST.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-sm-4">
                      <label className="form-label-modern label-blue text-xs">
                        Status Verifikasi
                      </label>
                      <select
                        className="form-select-modern input-blue py-1.5 text-xs font-semibold"
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                      >
                        <option value="ACC">Disetujui (ACC)</option>
                        <option value="REVISI">Perlu Revisi (Revisi)</option>
                        <option value="">Proses / Menunggu</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Uraian Kegiatan */}
                <div className="form-section-block form-section-violet py-3 px-3.5 mb-3">
                  <div className="form-section-header mb-2 pb-2">
                    <h5 className="form-section-title" style={{ fontSize: '0.85rem' }}>
                      <IconFileText size={16} color="#7c3aed" />
                      <span>Uraian Kegiatan SPJ</span>
                    </h5>
                    <span className="form-section-badge">Deskripsi</span>
                  </div>

                  <div>
                    <textarea
                      className="form-textarea-modern input-violet text-xs"
                      rows={2}
                      value={draftUraian}
                      onChange={(e) => setDraftUraian(e.target.value)}
                      placeholder="Uraian kegiatan belanja..."
                    />
                  </div>
                </div>

                {/* Section 3: Penerima & Nominal (Emerald) */}
                <div className="form-section-block form-section-emerald py-3 px-3.5 mb-3">
                  <div className="form-section-header mb-2.5 pb-2 d-flex align-items-center justify-content-between">
                    <h5 className="form-section-title" style={{ fontSize: '0.85rem' }}>
                      <IconCheck size={16} color="#059669" />
                      <span>Penerima Belanja &amp; Nilai Rupiah</span>
                    </h5>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold">Total:</span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          padding: '4px 10px',
                          borderRadius: '8px',
                        }}
                      >
                        {formatRp(totalNominal)}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    {pegawaiRows.map((row, idx) => (
                      <div
                        key={row.key}
                        className="d-flex gap-2 align-items-center bg-white p-2 rounded-xl border border-emerald-200"
                      >
                        <span className="text-[11px] font-bold text-emerald-800 w-5 text-center">
                          {idx + 1}.
                        </span>
                        <div className="flex-grow-1">
                          <input
                            type="text"
                            className="form-input-modern py-1 text-xs"
                            value={row.nama}
                            onChange={(e) => updateRow(row.key, { nama: e.target.value })}
                            placeholder="Nama Pegawai / Rekanan Toko"
                            list="nama-history-list"
                          />
                        </div>
                        <div style={{ width: '160px' }}>
                          <div className="position-relative">
                            <span
                              className="position-absolute start-0 top-50 translate-middle-y ps-2 text-slate-400 font-bold"
                              style={{ fontSize: '0.72rem' }}
                            >
                              Rp
                            </span>
                            <input
                              type="text"
                              className="form-input-modern py-1 text-xs ps-4 font-mono font-bold"
                              value={row.nominal}
                              onChange={(e) =>
                                updateRow(row.key, {
                                  nominal: formatRibuan(onlyDigits(e.target.value)),
                                })
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="btn btn-sm btn-outline-danger p-1 rounded-lg"
                          title="Hapus baris"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-end">
                    <button
                      type="button"
                      onClick={addRow}
                      className="btn btn-sm py-1 px-2.5 rounded-lg text-emerald-700 bg-emerald-100 hover:bg-emerald-200 font-bold text-xs d-inline-flex align-items-center gap-1"
                    >
                      <IconPlus size={13} />
                      <span>Tambah Penerima</span>
                    </button>
                  </div>
                </div>

                {/* Section 4: Tanggal Masuk & Catatan */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-sm-5">
                    <div className="form-section-block form-section-amber py-2.5 px-3 mb-0 h-100">
                      <label className="form-label-modern label-amber text-xs mb-1">
                        Tanggal Masuk SPJ
                      </label>
                      <div className="d-flex gap-1.5 align-items-center">
                        <input
                          type="date"
                          className="form-input-modern input-amber py-1 text-xs font-semibold"
                          value={draftTglMasuk}
                          onChange={(e) => setDraftTglMasuk(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setDraftTglMasuk(todayLocal())}
                          className="btn btn-sm btn-light border text-[11px] px-2 py-1 font-bold whitespace-nowrap"
                          title="Set ke tanggal hari ini"
                        >
                          Hari ini
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-7">
                    <div className="form-section-block form-section-rose py-2.5 px-3 mb-0 h-100">
                      <label className="form-label-modern label-rose text-xs mb-1">
                        Catatan Verifikator
                      </label>
                      <input
                        type="text"
                        className="form-input-modern input-rose py-1 text-xs"
                        value={draftKet}
                        onChange={(e) => setDraftKet(e.target.value)}
                        placeholder="Kelengkapan kuitansi, nota, dll."
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="mt-auto pt-3 border-t border-slate-200 d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-center">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn btn-sm btn-light border text-slate-600 font-bold px-3 py-2 rounded-xl text-xs w-100 w-sm-auto"
                  >
                    Pindai Ulang
                  </button>

                  <div className="d-flex gap-2 w-100 w-sm-auto">
                    <button
                      type="button"
                      onClick={handleOpenInFullForm}
                      className="btn btn-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold px-3 py-2 rounded-xl text-xs flex-fill d-flex align-items-center justify-content-center gap-1.5"
                      title="Buka form lengkap jika ingin mengisi tgl keluar, tgl berkas, tgl bayar"
                    >
                      <IconEdit size={14} />
                      <span>Lengkapi di Form Penuh</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleDirectSave}
                      className="btn btn-sm text-white font-extrabold px-4 py-2 rounded-xl text-xs flex-fill d-flex align-items-center justify-content-center gap-1.5 shadow-md active:scale-98"
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        border: 'none',
                      }}
                    >
                      {isSaving ? (
                        <>
                          <IconSpinner size={14} color="#ffffff" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <IconCheck size={14} color="#ffffff" />
                          <span>Simpan Langsung ke Register</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Datalist for Pegawai History */}
      <datalist id="nama-history-list">
        {namaHistory.map((nama) => (
          <option key={nama} value={nama} />
        ))}
      </datalist>
    </div>
  );
}
