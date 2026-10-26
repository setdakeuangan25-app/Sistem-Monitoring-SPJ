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
  IconPdf,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
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

  // Audio file upload handler (direct audio alternative)
  const handleAudioFileSelect = (file: File | null) => {
    if (!file) return;
    setAudioBlob(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setAnalysisError(null);
    setMicPermissionDenied(false);
    showToast('Audio Dipilih', `Berkas suara "${file.name}" siap dianalisis.`, 'success');
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
              'Akses mikrofon dibatasi oleh peramban. Anda dapat mengunggah berkas audio rekaman atau menggunakan simulasi dikte.',
            );
          }
        };

        recognition.onend = () => {
          // Keep active state synchronized
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
            'Izin mikrofon belum aktif di peramban. Anda dapat menggunakan tombol "Simulasi Dikte CV ESARINDO" atau mengunggah rekaman audio di bawah.',
          );
          return;
        }
      }
    } else if (!recognitionStarted) {
      setMicPermissionDenied(true);
      setAnalysisError(
        'Perangkat perekam audio tidak didukung di peramban ini. Anda dapat mengunggah rekaman suara atau menggunakan teks ringkas.',
      );
      return;
    }

    setIsRecording(true);
    setRecordSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordSeconds((sec) => sec + 1);
    }, 1000);
  };

  const stopRecording = () => {
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
  const handleAnalyze = async () => {
    const hasPhoto = !!imageFile;
    const hasVoice = !!audioBlob || !!speechTranscript.trim();
    const hasText = !!inputText.trim();

    if (!hasPhoto && !hasVoice && !hasText) {
      setAnalysisError(
        'Mohon sertakan setidaknya satu masukan: Upload kuitansi (PDF/Foto), dikte suara, atau ketik rincian berkas.',
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
        setAnalysisStep('Mengonversi berkas dokumen (PDF/Foto)...');
        imageBase64 = await fileToBase64(imageFile);
        imageMimeType =
          imageFile.type ||
          (imageFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      }

      if (audioBlob) {
        setAnalysisStep('Mengonversi data suara audio...');
        audioBase64 = await fileToBase64(audioBlob);
        audioMimeType = audioBlob.type || 'audio/webm';
      }

      setAnalysisStep('Gemini AI sedang membaca isi kuitansi & mengekstrak data...');

      // Combine text notes and transcribed voice speech
      const textParts = [
        inputText.trim(),
        speechTranscript && !inputText.includes(speechTranscript)
          ? `Transkrip Dikte Suara:\n${speechTranscript.trim()}`
          : '',
        additionalPrompt.trim() ? `Catatan Pengguna: ${additionalPrompt.trim()}` : '',
      ].filter(Boolean);

      const fullText = textParts.join('\n\n');

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

      // Enforce user rules:
      // - Bagian: kosong jika tidak tertera jelas
      // - Kategori: kosong jika tidak tertera jelas
      // - Status: default REVISI
      // - Catatan: default kosong
      // - Tanggal: default hari ini
      const bagianVal =
        raw.bagian && BAGIAN_LIST.includes(raw.bagian as any) ? raw.bagian : '';
      const kategoriVal =
        raw.kategori && KATEGORI_LIST.includes(raw.kategori as any) ? raw.kategori : '';
      const statusVal = raw.status || 'REVISI';
      const ketVal = raw.ket || '';
      const tglMasukVal = raw.tglMasuk || todayLocal();

      setDraftBagian(bagianVal);
      setDraftKategori(kategoriVal);
      setDraftStatus(statusVal);
      setDraftUraian(raw.uraian || '');
      setDraftTglMasuk(tglMasukVal);
      setDraftKet(ketVal);
      setConfidenceNote(
        raw.confidenceNote ||
          'Data kuitansi berhasil diekstrak dan disesuaikan dengan format SPJ Setda Kobar.',
      );

      // Populate pegawai / rekanan rows (e.g. CV ESARINDO MULTIGUNA LESTARI)
      if (Array.isArray(raw.pegawai) && raw.pegawai.length > 0) {
        setPegawaiRows(
          raw.pegawai.map((p: any) => ({
            key: nextKey(),
            nama: String(p.nama || 'CV ESARINDO MULTIGUNA LESTARI'),
            nominal: formatRibuan(String(p.nominal || 0)),
          })),
        );
      } else {
        setPegawaiRows([{ key: nextKey(), nama: '', nominal: '' }]);
      }

      setHasExtracted(true);
      showToast(
        'Ekstraksi Sukses',
        'Data kuitansi berhasil dianalisis AI! Silakan periksa draf di panel kanan.',
        'success',
      );
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
        className="hero-action-card mb-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 80%, #3730a3 100%)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '20px 24px',
          boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)',
        }}
      >
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
                <IconSparkles size={12} color="#ffffff" className="me-1 inline" />
                AI SCANNER · SETDA KOBAR
              </span>
            </div>
            <h3 className="hero-heading" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Input SPJ Otomatis dengan AI
            </h3>
          </div>
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
                style={{ fontSize: '0.8rem' }}
                onClick={() => setActiveTab('photo')}
              >
                <IconCamera size={15} color={activeTab === 'photo' ? '#2563eb' : 'currentColor'} />
                <span>Foto/Upload</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeTab === 'voice'
                    ? 'bg-white shadow-sm font-bold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 border-0'
                }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => setActiveTab('voice')}
              >
                <IconMic size={15} color={activeTab === 'voice' ? '#2563eb' : 'currentColor'} />
                <span>Dikte Suara</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeTab === 'text'
                    ? 'bg-white shadow-sm font-bold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 border-0'
                }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => setActiveTab('text')}
              >
                <IconFileText size={15} color={activeTab === 'text' ? '#7c3aed' : 'currentColor'} />
                <span>Teks Ringkas</span>
              </button>
            </div>

            {/* TAB CONTENT: Photo & PDF */}
            {activeTab === 'photo' && (
              <div className="flex-fill d-flex flex-column">
                {!imagePreview ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center flex-fill min-h-[220px] bg-slate-50/70 hover:bg-blue-50/50 shadow-sm"
                    style={{ borderStyle: 'dashed' }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                    />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-3 shadow-md">
                      <IconUpload size={24} color="#ffffff" />
                    </div>
                    <span className="font-extrabold text-sm text-slate-800">
                      Pilih atau Seret Berkas Kuitansi (PDF/Foto)
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex flex-col items-center justify-center p-3 min-h-[220px]">
                    {isPdf ? (
                      <div className="text-center p-4 w-100 d-flex flex-column align-items-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mb-2 shadow-lg">
                          <IconPdf size={32} color="#ffffff" />
                        </div>
                        <div className="font-bold text-sm text-white max-w-[260px] truncate">
                          {imageFile?.name || 'Dokumen Kuitansi.pdf'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {imageFile ? (imageFile.size / 1024).toFixed(0) : '0'} KB • Dokumen PDF
                        </div>
                      </div>
                    ) : (
                      <img
                        src={imagePreview}
                        alt="Pratinjau Kuitansi"
                        className="max-h-[260px] w-auto object-contain rounded-xl"
                      />
                    )}

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={clearImage}
                        className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1"
                        title="Hapus berkas ini"
                      >
                        <IconTrash size={13} color="#ffffff" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Voice & Dictation */}
            {activeTab === 'voice' && (
              <div className="flex-fill d-flex flex-column align-items-center justify-content-center p-6 rounded-2xl bg-slate-50/80 border border-slate-200 min-h-[220px]">
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleAudioFileSelect(e.target.files?.[0] || null)}
                />

                <div className="text-center w-100 d-flex flex-column align-items-center justify-content-center my-auto">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-8 ring-red-100'
                        : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:brightness-105 hover:shadow-2xl'
                    }`}
                    title={isRecording ? 'Berhenti dikte' : 'Mulai dikte suara'}
                  >
                    <IconMic size={34} color="#ffffff" />
                  </button>

                  {isRecording && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="font-mono text-sm font-bold text-red-600">
                        {Math.floor(recordSeconds / 60)
                          .toString()
                          .padStart(2, '0')}
                        :{(recordSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  {/* Live speech transcript box */}
                  {(speechTranscript || isRecording) && (
                    <div className="mt-3 p-3 rounded-xl bg-white border border-blue-200 text-start w-100 shadow-sm">
                      <p className="text-xs text-slate-800 font-medium mb-0 max-h-24 overflow-y-auto">
                        {speechTranscript || 'Mendengarkan ucapan Anda...'}
                      </p>
                    </div>
                  )}

                  {/* Audio player if audio blob captured */}
                  {audioUrl && !isRecording && (
                    <div className="mt-3 w-100 d-flex flex-column align-items-center">
                      <audio controls src={audioUrl} className="w-100 max-w-xs h-9 mb-2" />
                      <button
                        type="button"
                        onClick={clearAudio}
                        className="btn btn-sm btn-light border text-[11px] py-1 px-3 rounded-lg text-slate-600 font-medium"
                      >
                        Hapus Rekaman
                      </button>
                    </div>
                  )}
                </div>
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
                  placeholder="Ketik rincian nota atau kuitansi di sini..."
                  style={{ minHeight: '180px', fontSize: '0.85rem' }}
                />
              </div>
            )}

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
              /* Empty State Placeholder - Super Clean */
              <div className="flex-fill d-flex flex-column align-items-center justify-content-center p-4 text-center my-auto min-h-[300px]">
                <div
                  className="w-16 h-16 rounded-3xl d-flex align-items-center justify-content-center mb-3 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5' }}
                >
                  <IconSparkles size={32} color="#4f46e5" />
                </div>
                <h5 className="font-extrabold text-slate-700 mb-0" style={{ fontSize: '1rem' }}>
                  Belum Ada Berkas yang Dianalisis
                </h5>
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
                      <span className="font-bold block mb-0.5">Hasil Pembacaan Dokumen AI:</span>
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
                      <input
                        type="text"
                        className="form-input-modern input-rose py-1 text-xs"
                        value={draftKet}
                        onChange={(e) => setDraftKet(e.target.value)}
                        placeholder="Default kosong..."
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
