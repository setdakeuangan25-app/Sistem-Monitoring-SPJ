import { useEffect, useState } from 'react';

interface Props {
  email?: string;
  onLogout?: () => void;
}

export default function Header({ email, onLogout }: Props) {
  const [now, setNow] = useState(() => new Date().toLocaleString('id-ID'));

  useEffect(() => {
    const t = setInterval(() => setNow(new Date().toLocaleString('id-ID')), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="header-app d-flex justify-content-between align-items-center">
      <div className="d-flex align-items-center">
        <span style={{ fontSize: '1.8rem', marginRight: 15 }}>📑</span>
        <div>
          <h1 className="header-title">SISTEM MONITORING SPJ - SETDA KOBAR</h1>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontWeight: 500 }}>
            Sub Bagian Keuangan Sekretariat Daerah Kotawaringin Barat
          </div>
        </div>
      </div>
      <div className="header-actions">
        <div className="clock-badge">{now}</div>
        {onLogout && (
          <button type="button" className="btn-logout" onClick={onLogout} title={email}>
            Keluar
          </button>
        )}
      </div>
    </div>
  );
}
