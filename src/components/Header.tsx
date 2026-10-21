import React from 'react';
import { IconPlus, IconRefresh, IconMenu, IconSidebar } from './Icons';

interface Props {
  title: string;
  subtitle: string;
  showNewButton?: boolean;
  onNew?: () => void;
  onReload?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({
  title,
  subtitle,
  showNewButton,
  onNew,
  onReload,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  return (
    <header className="panel-topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className={`btn-toggle-sidebar ${!sidebarOpen ? 'is-collapsed' : ''}`}
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Sembunyikan menu' : 'Tampilkan menu'}
          >
            {sidebarOpen ? <IconSidebar size={18} /> : <IconMenu size={18} />}
            <span className="btn-toggle-label">{sidebarOpen ? 'Ciutkan Menu' : 'Menu'}</span>
          </button>
        )}

        <div className="topbar-text-group">
          <h2 className="topbar-title">{title}</h2>
          <p className="topbar-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="topbar-actions">
        {onReload && (
          <button
            type="button"
            className="btn-topbar-action btn-topbar-reload"
            onClick={onReload}
            title="Segarkan data dari server"
          >
            <IconRefresh size={15} />
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        )}
        {showNewButton && onNew && (
          <button
            type="button"
            className="btn-dark-pill btn-topbar-new"
            onClick={onNew}
            title="Input Berkas SPJ Baru"
          >
            <IconPlus size={15} />
            <span>SPJ Baru</span>
          </button>
        )}
      </div>
    </header>
  );
}
