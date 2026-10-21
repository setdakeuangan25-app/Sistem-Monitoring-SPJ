export default function Loader({ show }: { show: boolean }) {
  return (
    <div className="loading-screen" style={{ display: show ? 'flex' : 'none' }}>
      <div className="spinner-border" style={{ color: '#4f46e5', width: '3rem', height: '3rem' }} />
      <div className="mt-3 fw-bold" style={{ color: '#4b5563' }}>Memproses Data...</div>
    </div>
  );
}
