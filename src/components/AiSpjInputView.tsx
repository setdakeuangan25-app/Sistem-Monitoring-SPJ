import React, { useState, useRef, useEffect } from 'react';
import { BAGIAN_LIST, KATEGORI_LIST, type SpjInput, type Status } from '../types';
import { formatRibuan, formatRp, onlyDigits, titleCase, todayLocal } from '../utils/format';
import { showToast } from '../lib/alert';
import { completeSpj, type DetectedItem } from '../utils/fallbackExtract';
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
  IconPdf,
  IconChevronRight,
} from './Icons';

const KOLOM_LABEL: Record<string, string> = {
  bagian: 'Bagian',
  kategori: 'Kategori',
  uraian: 'Uraian',
  pegawai: 'Penerima & Nominal',
  tglMasuk: 'Tgl Masuk',
  tglBerkas: 'Tgl Berkas',
  tglBayar: 'Tgl Bayar',
  tglKeluar: 'Tgl Keluar',
  ket: 'Catatan',
  tidak_dipakai: 'Tidak dipakai',
};

export interface ExtractedSpjData {
  bagian: string;
  kategori: string;
  uraian: string;
  pegawai: { nama: string; nominal: number }[];
  tglMasuk: string;
  tglBerkas?: string;
  tglBayar?: string;
  tglKeluar?: string;
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

  // Voice recording & Speech-to-Text states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // Analysis & Loading
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Draft review form state: Default values according to Setda Kobar SPJ requirements
  const [hasExtracted, setHasExtracted] = useState(false);
  const [draftBagian, setDraftBagian] = useState<string>(''); // Default KOSONG
  const [draftKategori, setDraftKategori] = useState<string>(''); // Default KOSONG
  const [draftStatus, setDraftStatus] = useState<string>('REVISI'); // Default REVISI
  const [draftUraian, setDraftUraian] = useState<string>('');
  const [draftTglMasuk, setDraftTglMasuk] = useState<string>(todayLocal()); // Default HARI INI
  const [draftKet, setDraftKet] = useState<string>(''); // Default KOSONG
  const [draftTglBerkas, setDraftTglBerkas] = useState<string>('');
  const [draftTglBayar, setDraftTglBayar] = useState<string>('');
  const [draftTglKeluar, setDraftTglKeluar] = useState<string>('');
  const [detectedText, setDetectedText] = useState<string>('');
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [confidenceNote, setConfidenceNote] = useState<string>('');

  const keyRef = useRef(100);
  const nextKey = () => ++keyRef.current;
  const [pegawaiRows, setPegawaiRows] = useState<PegawaiRow[]>([
    { key: 1, nama: '', nominal: '' },
  ]);

  // Detect speech recognition capability
  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    setIsSpeechSupported(Boolean(hasSpeech));
  }, []);

  // Clean up blob URLs and listeners
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, [audioUrl, imagePreview]);

  // Image & PDF document handlers
  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      showToast(
        'Peringatan',
        'Silakan pilih berkas kuitansi berupa Dokumen PDF atau Foto Gambar (JPG, PNG, WebP).',
        'warning',
      );
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

  // Voice recording & Web Speech Recognition handlers
  const startRecording = async () => {
    setAnalysisError(null);
    setMicPermissionDenied(false);
    let recognitionStarted = false;
    let audioStreamStarted = false;

    // 1. Try starting browser native Web Speech Recognition (Voice-to-Text in Bahasa Indonesia)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          const trimmed = currentTranscript.trim();
          setSpeechTranscript(trimmed);
          setInputText((prev) => {
            // Update input text with recognized words
            return trimmed;
          });
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            setMicPermissionDenied(true);
            setAnalysisError(
              'Akses mikrofon dibatasi oleh peramban. Izinkan akses mikrofon, atau gunakan tab Teks Ringkas.',
            );
          }
        };

        recognition.onend = () => {
          // Chrome menghentikan pengenalan saat hening; sambung lagi selama masih merekam
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        recognitionStarted = true;
      } catch (e) {
        // Speech recognition couldn't be initialized directly
      }
    }

    // 2. Try recording audio stream with MediaRecorder
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];

        let chosenMime = '';
        if (typeof MediaRecorder !== 'undefined') {
          const candidates = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            'audio/wav',
          ];
          for (const cand of candidates) {
            if (MediaRecorder.isTypeSupported(cand)) {
              chosenMime = cand;
              break;
            }
          }
        }

        const mediaRecorder = new MediaRecorder(
          stream,
          chosenMime ? { mimeType: chosenMime } : undefined,
        );
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const finalMime = chosenMime || 'audio/webm';
          const audioBlobCombined = new Blob(audioChunksRef.current, { type: finalMime });
          setAudioBlob(audioBlobCombined);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(audioBlobCombined));
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(250);
        audioStreamStarted = true;
      } catch (err: any) {
        if (!recognitionStarted) {
          setMicPermissionDenied(true);
          setAnalysisError(
            'Izin mikrofon belum aktif di peramban. Izinkan akses mikrofon, atau gunakan tab Teks Ringkas.',
          );
          return;
        }
      }
    } else if (!recognitionStarted) {
      setMicPermissionDenied(true);
      setAnalysisError(
        'Perangkat perekam audio tidak didukung di peramban ini. Gunakan tab Teks Ringkas.',
      );
      return;
    }

    isRecordingRef.current = true;
    setIsRecording(true);
    setRecordSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordSeconds((sec) => sec + 1);
    }, 1000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const clearAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSpeechTranscript('');
    setRecordSeconds(0);
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

  // Presets loader including CamScanner PDF and CV ESARINDO format
  const loadPreset = async (type: 'esarindo-pdf' | 'esarindo-dikte' | 'atk' | 'perjadin') => {
    if (type === 'esarindo-pdf') {
      try {
        const res = await fetch('/assets/aistudio/CamScanner_26-10-26_11.47_87d7f432.pdf');
        if (!res.ok) throw new Error('Berkas tidak ditemukan');
        const blob = await res.blob();
        const file = new File([blob], 'CamScanner_Kuitansi_Setda_Kobar.pdf', {
          type: 'application/pdf',
        });
        handleImageSelect(file);
        setActiveTab('photo');
        showToast(
          'Kuitansi PDF Dimuat',
          'Dokumen Kuitansi CamScanner CV ESARINDO berhasil dimuat! Klik tombol "Analisis & Ekstrak Data SPJ" untuk memproses.',
          'success',
        );
      } catch (e) {
        showToast('Info', 'Memuat berkas PDF contoh...', 'info');
      }
    } else if (type === 'esarindo-dikte') {
      setActiveTab('voice');
      const textSample =
        'Kuitansi Pembayaran Pekerjaan Belanja Bahan-Bahan Lainnya Keperluan Sekretariat Daerah Kabupaten Kotawaringin Barat, Sub Kegiatan Penyediaan Peralatan Rumah Tangga, Kegiatan Administrasi Umum Perangkat Daerah Berdasarkan: Surat Pesanan No. 027/SP. 45/BU.III tanggal 19 Oktober 2026, Berita Acara Pembayaran No. 900/BAP.63/BU tanggal 22 Oktober 2026, Berita Acara Serah Terima Hasil Pekerjaan No. 027/BASTP-52/X/2026/BU tanggal 21 Oktober 2026. Yang Menerima CV ESARINDO MULTIGUNA LESTARI dengan jumlah Rp 6.017.310.';
      setInputText(textSample);
      setSpeechTranscript(textSample);
      showToast(
        'Dikte Dimuat',
        'Simulasi dikte suara kuitansi CV ESARINDO berhasil dimasukkan. Siap dianalisis AI!',
        'info',
      );
    } else if (type === 'atk') {
      setActiveTab('text');
      setInputText(
        'Kuitansi Belanja Alat Tulis Kantor (ATK) dan Kertas HVS untuk Sekretariat Daerah. Toko Penyedia: Toko Barata Pangkalan Bun. Rincian: Kertas HVS A4 10 rim Rp 550.000, Tinta Printer 4 botol Rp 480.000, Odner Rp 220.000. Total kuitansi Rp 1.250.000 tanggal 14 Maret 2026.',
      );
      showToast('Contoh Dimuat', 'Data contoh ATK berhasil dimuat.', 'info');
    } else {
      setActiveTab('text');
      setInputText(
        'Perjalanan Dinas ke Palangka Raya selama 3 hari. Pelaksana tugas: Ir. Bambang Hermanto nominal Rp 2.450.000, Rahmat Hidayat nominal Rp 1.850.000. Tanggal berangkat 10 Maret 2026.',
      );
      showToast('Contoh Dimuat', 'Data contoh Perjadin berhasil dimuat.', 'info');
    }
  };

  // Submit to Gemini API
  // Selalu menghasilkan draf: jika suara kosong, pakai masukan lain; jika AI gagal, pakai fallback lokal.
  const handleAnalyze = async () => {
    const today = todayLocal();
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep('Menghubungkan ke Gemini AI...');

    const voiceText = speechTranscript.trim();
    const textParts = [
      inputText.trim(),
      voiceText && !inputText.includes(voiceText) ? `Transkrip Dikte Suara:\n${voiceText}` : '',
      additionalPrompt.trim() ? `Catatan Pengguna: ${additionalPrompt.trim()}` : '',
    ].filter(Boolean);
    const fullText = textParts.join('\n\n');

    let raw: any;
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let audioBase64: string | undefined;
      let audioMimeType: string | undefined;

      if (imageFile) {
        setAnalysisStep('Mengonversi berkas dokumen (PDF/Foto)...');
        imageBase64 = await fileToBase64(imageFile);
        imageMimeType =
          imageFile.type ||
          (imageFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      }

      // Audio hanya dikirim jika ada isinya dan transkrip belum tersedia
      if (audioBlob && audioBlob.size > 800 && !voiceText) {
        setAnalysisStep('Mengonversi data suara audio...');
        audioBase64 = await fileToBase64(audioBlob);
        audioMimeType = audioBlob.type || 'audio/webm';
      }

      if (!imageBase64 && !audioBase64 && !fullText) {
        raw = completeSpj(
          null,
          '',
          today,
          'Tidak ada data terbaca dari masukan. Draf kosong disiapkan, silakan lengkapi secara manual.',
        );
      } else {
        setAnalysisStep('Gemini AI sedang membaca isi kuitansi & mengekstrak data...');
        const response = await fetch('/api/gemini/extract-spj', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: fullText,
            imageBase64,
            imageMimeType,
            audioBase64,
            audioMimeType,
            today,
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Gagal mengekstrak data dari masukan.');
        }
        raw = result.data;
      }
    } catch (err: any) {
      console.warn('AI tidak tersedia, memakai fallback lokal:', err);
      raw = completeSpj(
        null,
        fullText,
        today,
        `AI tidak dapat dihubungi (${err?.message || 'kesalahan jaringan'}). Draf disusun otomatis dari masukan yang ada, mohon periksa kembali.`,
      );
    }

    setAnalysisStep('Menyusun draf formulir SPJ...');

    // Aturan: bagian/kategori kosong jika tidak jelas, status default REVISI, tanggal default hari ini
    const bagianVal = raw.bagian && BAGIAN_LIST.includes(raw.bagian as any) ? raw.bagian : '';
    const kategoriVal =
      raw.kategori && KATEGORI_LIST.includes(raw.kategori as any) ? raw.kategori : '';

    setDraftBagian(bagianVal);
    setDraftKategori(kategoriVal);
    setDraftStatus(raw.status || 'REVISI');
    setDraftUraian(raw.uraian || '');
    setDraftTglMasuk(raw.tglMasuk || today);
    setDraftKet(raw.ket || '');
    setDraftTglBerkas(raw.tglBerkas || '');
    setDraftTglBayar(raw.tglBayar || '');
    setDraftTglKeluar(raw.tglKeluar || '');
    setDetectedText(raw.teksTerbaca || '');
    setDetectedItems(Array.isArray(raw.detail) ? raw.detail : []);
    setConfidenceNote(
      raw.confidenceNote ||
        'Data kuitansi berhasil diekstrak dan disesuaikan dengan format SPJ Setda Kobar.',
    );

    if (Array.isArray(raw.pegawai) && raw.pegawai.length > 0) {
      setPegawaiRows(
        raw.pegawai.map((p: any) => ({
          key: nextKey(),
          nama: String(p.nama || ''),
          nominal: p.nominal ? formatRibuan(String(p.nominal)) : '',
        })),
      );
    } else {
      setPegawaiRows([{ key: nextKey(), nama: '', nominal: '' }]);
    }

    setHasExtracted(true);
    setIsAnalyzing(false);
    setAnalysisStep('');
    showToast(
      'Draf Siap',
      'Draf SPJ berhasil dibuat. Silakan periksa di panel kanan.',
      'success',
    );
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
      showToast('Peringatan', 'Minimal harus ada 1 nama penerima/rekanan!', 'warning');
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
      showToast(
        'Peringatan',
        'Mohon isi nama rekanan/penerima beserta nominal yang valid.',
        'warning',
      );
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
        tglKeluar: draftTglKeluar,
        tglBerkas: draftTglBerkas,
        tglBayar: draftTglBayar,
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
      .map((r) => ({
        nama: titleCase(r.nama.trim()),
        nominal: Number(onlyDigits(r.nominal) || 0),
      }))
      .filter((r) => r.nama);

    onTransferToForm({
      bagian: draftBagian,
      kategori: draftKategori,
      uraian: draftUraian,
      pegawai:
        pegawai.length > 0 ? pegawai : [{ nama: 'Penerima Belanja', nominal: totalNominal }],
      tglMasuk: draftTglMasuk,
      tglBerkas: draftTglBerkas,
      tglBayar: draftTglBayar,
      tglKeluar: draftTglKeluar,
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
    setSpeechTranscript('');
    setAnalysisError(null);
    setDraftBagian('');
    setDraftKategori('');
    setDraftStatus('REVISI');
    setDraftKet('');
    setDraftTglBerkas('');
    setDraftTglBayar('');
    setDraftTglKeluar('');
    setDetectedText('');
    setDetectedItems([]);
    setDraftTglMasuk(todayLocal());
    setPegawaiRows([{ key: nextKey(), nama: '', nominal: '' }]);
  };

  const isPdf =
    imageFile?.type === 'application/pdf' ||
    Boolean(imageFile?.name?.toLowerCase().endsWith('.pdf'));

  return (
    <div className="modern-form-container" style={{ maxWidth: '1220px', margin: '0 auto' }}>
      {/* Hero Action Banner matching Dashboard style */}
      <div
        className="hero-action-card ai-hero ai-reveal mb-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 80%, #3730a3 100%)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '20px 24px',
          boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)',
        }}
      >
        <span className="ai-orb ai-orb-1" aria-hidden="true" />
        <span className="ai-orb ai-orb-2" aria-hidden="true" />
        <span className="ai-orb ai-orb-3" aria-hidden="true" />
        <div className="hero-text d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                className="badge"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  letterSpacing: '0.5px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                }}
              >
                <span className="ai-sparkle me-1">
                  <IconSparkles size={12} color="#ffffff" />
                </span>
                AI SCANNER · SETDA KOBAR
              </span>
            </div>
            <h3 className="hero-heading" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Input SPJ Otomatis dengan AI
            </h3>
          </div>
          <div className="ai-eq" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="row g-4 align-items-stretch">
        {/* ========================================================
            LEFT COLUMN: Input & Extraction Source (45%)
            ======================================================== */}
        <div className="col-12 col-lg-5 ai-reveal" style={{ ["--d" as any]: "120ms" }}>
          <div
            className="form-card-wrap ai-card h-100 d-flex flex-column"
            style={{
              padding: '24px 22px',
              borderRadius: '22px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div className="form-header-group pb-3 mb-3 d-flex justify-content-between align-items-center">
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  1. Masukan Dokumen / Suara
                </h4>
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
              className="ai-tabs"
              role="tablist"
              style={{ ["--i" as any]: activeTab === 'photo' ? 0 : activeTab === 'voice' ? 1 : 2 }}
            >
              <span className="ai-tab-indicator" aria-hidden="true" />
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'photo'}
                className={`ai-tab ${activeTab === 'photo' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('photo')}
              >
                <IconCamera size={15} color={activeTab === 'photo' ? '#2563eb' : 'currentColor'} />
                <span>Foto/Upload</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'voice'}
                className={`ai-tab ${activeTab === 'voice' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('voice')}
              >
                <IconMic size={15} color={activeTab === 'voice' ? '#2563eb' : 'currentColor'} />
                <span>Dikte Suara</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'text'}
                className={`ai-tab ${activeTab === 'text' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                <IconFileText size={15} color={activeTab === 'text' ? '#7c3aed' : 'currentColor'} />
                <span>Teks Ringkas</span>
              </button>
            </div>

            {/* TAB CONTENT: Photo & PDF */}
            {activeTab === 'photo' && (
              <div key="photo" className="ai-panel">
                {!imagePreview ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="ai-dropzone"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                    />
                    <div className="ai-dropzone-icon">
                      <IconUpload size={24} color="#ffffff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                      Pilih atau Seret Berkas Kuitansi (PDF/Foto)
                    </span>
                  </div>
                ) : (
                  <div className="ai-preview">
                    {isPdf ? (
                      <div className="text-center p-4 w-100 d-flex flex-column align-items-center">
                        <div
                          className="d-flex align-items-center justify-content-center mb-2"
                          style={{ width: 64, height: 64, borderRadius: 16, background: '#dc2626' }}
                        >
                          <IconPdf size={32} color="#ffffff" />
                        </div>
                        <div className="fw-bold text-white text-truncate" style={{ maxWidth: 260, fontSize: '0.88rem' }}>
                          {imageFile?.name || 'Dokumen Kuitansi.pdf'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                          {imageFile ? (imageFile.size / 1024).toFixed(0) : '0'} KB • Dokumen PDF
                        </div>
                      </div>
                    ) : (
                      <img
                        src={imagePreview}
                        alt="Pratinjau Kuitansi"
                        style={{ maxHeight: 260, width: 'auto', maxWidth: '100%', objectFit: 'contain', borderRadius: 12 }}
                      />
                    )}

                    <button type="button" onClick={clearImage} className="ai-preview-del" title="Hapus berkas ini">
                      <IconTrash size={13} color="#ffffff" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Voice & Dictation */}
            {activeTab === 'voice' && (
              <div key="voice" className="ai-panel">
                <div className="ai-voice">
                  <div className={`ai-mic-wrap ${isRecording ? 'is-rec' : ''}`}>
                    <span className="ai-mic-ring" />
                    <span className="ai-mic-ring" />
                    <span className="ai-mic-ring" />
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`ai-mic ${isRecording ? 'is-rec' : ''}`}
                      title={isRecording ? 'Berhenti dikte' : 'Mulai dikte suara'}
                      aria-label={isRecording ? 'Berhenti dikte' : 'Mulai dikte suara'}
                    >
                      <IconMic size={34} color="#ffffff" />
                    </button>
                  </div>

                  {isRecording ? (
                    <>
                      <div className="ai-wave" aria-hidden="true">
                        {Array.from({ length: 11 }).map((_, i) => (
                          <span key={i} />
                        ))}
                      </div>
                      <p className="ai-voice-title" style={{ color: '#dc2626', fontFamily: 'monospace' }}>
                        {Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:
                        {(recordSeconds % 60).toString().padStart(2, '0')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="ai-voice-title">Klik Mikrofon untuk Mulai Dikte</p>
                      <p className="ai-voice-sub">
                        Sebutkan detail kuitansi, nama rekanan penyedia, nominal rupiah, dan uraian belanja.
                      </p>
                    </>
                  )}

                  {(speechTranscript || isRecording) && (
                    <div className="ai-transcript">
                      {speechTranscript || 'Mendengarkan ucapan Anda...'}
                    </div>
                  )}

                  {!isRecording && recordSeconds > 0 && !speechTranscript.trim() && (
                    <div className="ai-voice-note">
                      Tidak ada suara yang terbaca. AI tetap akan memakai berkas, teks, atau petunjuk lain yang sudah Anda isi.
                    </div>
                  )}

                  {audioUrl && !isRecording && (
                    <div className="mt-3 w-100 d-flex flex-column align-items-center">
                      <audio controls src={audioUrl} className="w-100 mb-2" style={{ maxWidth: 320, height: 36 }} />
                      <button type="button" onClick={clearAudio} className="ai-chip" style={{ padding: '4px 12px', fontSize: '0.72rem' }}>
                        Hapus Rekaman
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB CONTENT: Text */}
            {activeTab === 'text' && (
              <div key="text" className="ai-panel">
                <textarea
                  className="form-textarea-modern flex-fill"
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik rincian nota atau kuitansi di sini..."
                  style={{ minHeight: '180px', fontSize: '0.85rem' }}
                />
              </div>
            )}

            {/* Petunjuk tambahan untuk AI */}
            <div className="ai-hint">
              <label className="ai-hint-label" htmlFor="ai-hint-input">
                Petunjuk Tambahan untuk AI (Opsional)
              </label>
              <input
                id="ai-hint-input"
                type="text"
                className="ai-hint-input"
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="Misal: Bagian Umum, nomor SP 027/SP.45, dll."
              />
            </div>

            {/* Error Banner */}
            {analysisError && (
              <div className="ai-banner mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium d-flex align-items-center justify-content-between">
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
                className={`ai-analyze d-flex align-items-center justify-content-center gap-2 ${isAnalyzing ? 'is-busy' : ''}`}
                aria-busy={isAnalyzing}
              >
                {isAnalyzing ? (
                  <span key="busy" className="ai-analyze-label">
                    <IconSpinner size={18} color="#ffffff" />
                    <span>{analysisStep || 'Sedang Memproses dengan AI...'}</span>
                  </span>
                ) : (
                  <span key="idle" className="ai-analyze-label">
                    <IconSparkles size={18} color="#ffffff" />
                    <span>Analisis &amp; Ekstrak Data SPJ</span>
                  </span>
                )}
                {isAnalyzing && <span className="ai-progress" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: Review & Form Draft (55%)
            ======================================================== */}
        <div className="col-12 col-lg-7 ai-reveal" style={{ ["--d" as any]: "220ms" }}>
          <div
            className="form-card-wrap ai-card h-100 d-flex flex-column"
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
              </div>
              <span
                key={hasExtracted ? 'done' : 'wait'}
                className="badge ai-pop"
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
              /* Empty State Placeholder - Super Clean */
              <div className="flex-fill d-flex flex-column align-items-center justify-content-center p-4 text-center my-auto" style={{ minHeight: 300 }}>
                <div className="ai-empty-icon">
                  <IconSparkles size={32} color="#4f46e5" />
                </div>
                <h5 className="font-extrabold text-slate-700 mb-0" style={{ fontSize: '1rem' }}>
                  Belum Ada Berkas yang Dianalisis
                </h5>
              </div>
            ) : (
              /* Extracted Review & Editor Form */
              <div className="flex-fill d-flex flex-column ai-stagger">
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
                      <span className="font-bold block mb-0.5">Hasil Pembacaan Dokumen AI:</span>
                      <span className="text-blue-900">{confidenceNote}</span>
                    </div>
                  </div>
                )}

                {/* Teks terdeteksi & pengelompokan ke kolom form */}
                {(detectedItems.length > 0 || detectedText) && (
                  <div className="ai-detect">
                    <div className="ai-detect-head">
                      <span className="ai-sparkle">
                        <IconSparkles size={14} color="#7c3aed" />
                      </span>
                      <span>Teks Terdeteksi &amp; Pengelompokan</span>
                      <span className="ai-detect-count">{detectedItems.length} item</span>
                    </div>

                    {Array.from(new Set(detectedItems.map((d) => d.kelompok))).map((grp, gi) => (
                      <div key={grp} className="ai-detect-group" style={{ ['--g' as any]: `${gi * 60}ms` }}>
                        <div className="ai-detect-group-title">{grp}</div>
                        {detectedItems
                          .filter((d) => d.kelompok === grp)
                          .map((d, i) => (
                            <div key={i} className="ai-detect-item">
                              <span className="ai-detect-label">{d.label || '-'}</span>
                              <span className="ai-detect-value">{d.nilai}</span>
                              <span className={`ai-detect-badge ${d.kolom === 'tidak_dipakai' ? 'is-muted' : ''}`}>
                                {KOLOM_LABEL[d.kolom] || d.kolom}
                              </span>
                            </div>
                          ))}
                      </div>
                    ))}

                    {detectedText && (
                      <details className="ai-detect-raw">
                        <summary>Lihat seluruh teks hasil baca (OCR)</summary>
                        <pre>{detectedText}</pre>
                      </details>
                    )}
                  </div>
                )}

                {/* Section 1: Identitas & Klasifikasi */}
                <div className="form-section-block form-section-blue py-3 px-3.5 mb-3">
                  <div className="form-section-header mb-2.5 pb-2">
                    <h5 className="form-section-title" style={{ fontSize: '0.85rem' }}>
                      <IconFileText size={16} color="#2563eb" />
                      <span>Identitas &amp; Klasifikasi SPJ</span>
                    </h5>
                    <span className="form-section-badge">Bagian &amp; Kategori Default Kosong</span>
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
                        <option value="">-- Kosong / Belum Dipilih --</option>
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
                        <option value="">-- Kosong / Belum Dipilih --</option>
                        {KATEGORI_LIST.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-sm-4">
                      <label className="form-label-modern label-blue text-xs">
                        Status Verifikasi <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select-modern input-blue py-1.5 text-xs font-semibold"
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                      >
                        <option value="REVISI">Perlu Revisi (Revisi - Default)</option>
                        <option value="ACC">Disetujui (ACC)</option>
                        <option value="">Proses / Menunggu</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Uraian Kegiatan (Lengkap dengan rincian dokumen) */}
                <div className="form-section-block form-section-violet py-3 px-3.5 mb-3">
                  <div className="form-section-header mb-2 pb-2">
                    <h5 className="form-section-title" style={{ fontSize: '0.85rem' }}>
                      <IconFileText size={16} color="#7c3aed" />
                      <span>Uraian Kegiatan &amp; Dokumen Pendukung (SP, BAP, BASTP)</span>
                    </h5>
                    <span className="form-section-badge">Lengkap</span>
                  </div>

                  <div>
                    <textarea
                      className="form-textarea-modern input-violet text-xs"
                      rows={5}
                      value={draftUraian}
                      onChange={(e) => setDraftUraian(e.target.value)}
                      placeholder="Uraian kegiatan belanja secara lengkap..."
                      style={{ lineHeight: 1.5, fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                {/* Section 3: Penerima & Nominal (Emerald) */}
                <div className="form-section-block form-section-emerald py-3 px-3.5 mb-3">
                  <div className="form-section-header mb-2.5 pb-2 d-flex align-items-center justify-content-between">
                    <h5 className="form-section-title" style={{ fontSize: '0.85rem' }}>
                      <IconCheck size={16} color="#059669" />
                      <span>Rekanan Penerima &amp; Jumlah Kuitansi</span>
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
                        className="ai-row-in d-flex gap-2 align-items-center bg-white p-2 rounded-xl border border-emerald-200"
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
                            placeholder="Nama CV Rekanan / Toko / Pegawai"
                            list="nama-history-list"
                          />
                        </div>
                        <div style={{ width: '170px' }}>
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
                        Tanggal Masuk (Default Hari Ini)
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
                        Catatan Verifikator (Default Kosong)
                      </label>
                      <textarea
                        rows={3}
                        className="form-input-modern input-rose py-1 text-xs"
                        style={{ resize: 'vertical' }}
                        value={draftKet}
                        onChange={(e) => setDraftKet(e.target.value)}
                        placeholder="Default kosong..."
                      />
                    </div>
                  </div>
                </div>

                {/* Tanggal alur berkas (terisi hanya jika tertulis jelas di dokumen) */}
                <div className="form-section-block form-section-amber py-2.5 px-3 mb-3">
                  <label className="form-label-modern label-amber text-xs mb-1">
                    Tanggal Alur Berkas (Opsional, terisi jika tertulis jelas di dokumen)
                  </label>
                  <div className="row g-2">
                    <div className="col-12 col-sm-4">
                      <span className="ai-date-cap">Tgl Berkas Lengkap</span>
                      <input
                        type="date"
                        className="form-input-modern input-amber py-1 text-xs"
                        value={draftTglBerkas}
                        onChange={(e) => setDraftTglBerkas(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-sm-4">
                      <span className="ai-date-cap">Tgl Bayar / SPM</span>
                      <input
                        type="date"
                        className="form-input-modern input-amber py-1 text-xs"
                        value={draftTglBayar}
                        onChange={(e) => setDraftTglBayar(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-sm-4">
                      <span className="ai-date-cap">Tgl Keluar</span>
                      <input
                        type="date"
                        className="form-input-modern input-amber py-1 text-xs"
                        value={draftTglKeluar}
                        onChange={(e) => setDraftTglKeluar(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="mt-auto pt-3 border-t border-slate-200 d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-center">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="ai-btn btn btn-sm btn-light border text-slate-600 font-bold px-3 py-2 rounded-xl text-xs w-100 w-sm-auto"
                  >
                    Pindai Ulang
                  </button>

                  <div className="d-flex gap-2 w-100 w-sm-auto">
                    <button
                      type="button"
                      onClick={handleOpenInFullForm}
                      className="ai-btn btn btn-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold px-3 py-2 rounded-xl text-xs flex-fill d-flex align-items-center justify-content-center gap-1.5"
                      title="Buka form lengkap jika ingin mengisi tgl keluar, tgl berkas, tgl bayar"
                    >
                      <IconEdit size={14} />
                      <span>Lengkapi di Form Penuh</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleDirectSave}
                      className="ai-btn btn btn-sm text-white font-extrabold px-4 py-2 rounded-xl text-xs flex-fill d-flex align-items-center justify-content-center gap-1.5 shadow-md active:scale-98"
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
