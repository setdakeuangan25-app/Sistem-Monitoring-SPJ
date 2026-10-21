import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  color?: string;
}

/* Modern Flat Dashboard Icon (4 rounded flat tiles) */
export const IconDashboard: React.FC<IconProps> = ({ size = 20, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <rect x="3" y="3" width="8" height="8" rx="2.5" fill={color} />
    <rect x="13" y="3" width="8" height="5" rx="2" fill={color} opacity="0.8" />
    <rect x="13" y="10" width="8" height="11" rx="2.5" fill={color} />
    <rect x="3" y="13" width="8" height="8" rx="2.5" fill={color} opacity="0.8" />
  </svg>
);

/* Modern Flat Register / Document Ledger Icon */
export const IconRegister: React.FC<IconProps> = ({ size = 20, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M5 4C5 2.89543 5.89543 2 7 2H14.5L19 6.5V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V4Z"
      fill={color}
    />
    <path d="M14 2V6.5H18.5L14 2Z" fill="#ffffff" opacity="0.4" />
    <rect x="8" y="10" width="8" height="2" rx="1" fill="#ffffff" />
    <rect x="8" y="14" width="8" height="2" rx="1" fill="#ffffff" />
    <rect x="8" y="18" width="5" height="2" rx="1" fill="#ffffff" />
  </svg>
);

/* Modern Flat Add / Plus Circle Icon */
export const IconAdd: React.FC<IconProps> = ({ size = 20, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <circle cx="12" cy="12" r="10" fill={color} />
    <rect x="11" y="7" width="2" height="10" rx="1" fill="#ffffff" />
    <rect x="7" y="11" width="10" height="2" rx="1" fill="#ffffff" />
  </svg>
);

/* Modern Flat Plus (bold glyph) */
export const IconPlus: React.FC<IconProps> = ({ size = 16, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M12 4C12.6904 4 13.25 4.55964 13.25 5.25V10.75H18.75C19.4404 10.75 20 11.3096 20 12C20 12.6904 19.4404 13.25 18.75 13.25H13.25V18.75C13.25 19.4404 12.6904 20 12 20C11.3096 20 10.75 19.4404 10.75 18.75V13.25H5.25C4.55964 13.25 4 12.6904 4 12C4 11.3096 4.55964 10.75 5.25 10.75H10.75V5.25C10.75 4.55964 11.3096 4 12 4Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Search Magnifier */
export const IconSearch: React.FC<IconProps> = ({ size = 18, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18C12.6598 18 14.1837 17.4243 15.3853 16.4594L18.9628 20.0369C19.3533 20.4274 19.9865 20.4274 20.377 20.0369C20.7675 19.6464 20.7675 19.0132 20.377 18.6227L16.7995 15.0452C17.5583 13.8821 18 12.4925 18 11C18 7.13401 14.866 4 11 4ZM6.5 11C6.5 8.51472 8.51472 6.5 11 6.5C13.4853 6.5 15.5 8.51472 15.5 11C15.5 13.4853 13.4853 15.5 11 15.5C8.51472 15.5 6.5 13.4853 6.5 11Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Excel Spreadsheet Icon */
export const IconExcel: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="3.5" fill="#16a34a" />
    <path
      d="M8.2 8L10.7 12L8 16H9.9L11.7 13.2L13.5 16H15.4L12.7 12L15.2 8H13.3L11.7 10.7L10.1 8H8.2Z"
      fill="#ffffff"
    />
  </svg>
);

/* Modern Flat PDF Document Icon */
export const IconPdf: React.FC<IconProps> = ({ size = 16, className, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="3.5" fill="#dc2626" />
    <path
      d="M7 8H10C11.1 8 12 8.9 12 10C12 11.1 11.1 12 10 12H8.5V16H7V8ZM8.5 9.5V10.5H10C10.3 10.5 10.5 10.3 10.5 10C10.5 9.7 10.3 9.5 10 9.5H8.5Z"
      fill="#ffffff"
    />
    <path
      d="M13.5 8H15C16.1 8 17 8.9 17 10V14C17 15.1 16.1 16 15 16H13.5V8ZM15 9.5V14.5C15.3 14.5 15.5 14.3 15.5 14V10C15.5 9.7 15.3 9.5 15 9.5Z"
      fill="#ffffff"
    />
  </svg>
);

/* Modern Flat Edit Pen/Pencil Icon */
export const IconEdit: React.FC<IconProps> = ({ size = 14, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Print Machine Icon */
export const IconPrint: React.FC<IconProps> = ({ size = 14, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path d="M6 3C6 2.45 6.45 2 7 2H17C17.55 2 18 2.45 18 3V6H6V3Z" fill={color} opacity="0.7" />
    <path
      d="M4 7C2.9 7 2 7.9 2 9V16C2 17.1 2.9 18 4 18H6V21C6 21.55 6.45 22 7 22H17C17.55 22 18 21.55 18 21V18H20C21.1 18 22 17.1 22 16V9C22 7.9 21.1 7 20 7H4ZM8 14H16V20H8V14ZM19 10.5C18.45 10.5 18 10.05 18 9.5C18 8.95 18.45 8.5 19 8.5C19.55 8.5 20 8.95 20 9.5C20 10.05 19.55 10.5 19 10.5Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Trash Can Icon */
export const IconTrash: React.FC<IconProps> = ({ size = 14, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M6 7H18V19C18 20.1 17.1 21 16 21H8C6.9 21 6 20.1 6 19V7ZM9 10C8.45 10 8 10.45 8 11V17C8 17.55 8.45 18 9 18C9.55 18 10 17.55 10 17V11C10 10.45 9.55 10 9 10ZM15 10C14.45 10 14 10.45 14 11V17C14 17.55 14.45 18 15 18C15.55 18 16 17.55 16 17V11C16 10.45 15.55 10 15 10Z"
      fill={color}
    />
    <path
      d="M15.5 4L14.5 3H9.5L8.5 4H5C4.45 4 4 4.45 4 5C4 5.55 4.45 6 5 6H19C19.55 6 20 5.55 20 5C20 4.45 19.55 4 19 4H15.5Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Logout Icon */
export const IconLogout: React.FC<IconProps> = ({ size = 14, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M4 5C4 3.9 4.9 3 6 3H11C11.55 3 12 3.45 12 4C12 4.55 11.55 5 11 5H6V19H11C11.55 19 12 19.45 12 20C12 20.55 11.55 21 11 21H6C4.9 21 4 20.1 4 19V5ZM19.71 11.29C20.1 11.68 20.1 12.31 19.71 12.7L15.71 16.7C15.32 17.09 14.69 17.09 14.3 16.7C13.91 16.31 13.91 15.68 14.3 15.29L16.59 13H9C8.45 13 8 12.55 8 12C8 11.45 8.45 11 9 11H16.59L14.3 8.71C13.91 8.32 13.91 7.69 14.3 7.3C14.69 6.91 15.32 6.91 15.71 7.3L19.71 11.29Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Refresh Sync Icon */
export const IconRefresh: React.FC<IconProps> = ({ size = 14, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Calendar Icon */
export const IconCalendar: React.FC<IconProps> = ({ size = 14, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <rect x="3" y="4" width="18" height="17" rx="3.5" fill={color} opacity="0.15" />
    <path
      d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20Z"
      fill={color}
    />
    <rect x="7" y="11" width="3" height="3" rx="1" fill={color} />
    <rect x="12" y="11" width="3" height="3" rx="1" fill={color} />
    <rect x="12" y="15" width="3" height="3" rx="1" fill={color} />
    <rect x="7" y="15" width="3" height="3" rx="1" fill={color} />
  </svg>
);

/* Modern Flat Check Circle (Solid) */
export const IconCheckCircle: React.FC<IconProps> = ({ size = 16, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <circle cx="12" cy="12" r="10" fill={color} />
    <path
      d="M9.5 12.5L11 14L15 9.5"
      stroke="#ffffff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* Modern Flat Alert Exclamation Circle (Solid) */
export const IconAlertCircle: React.FC<IconProps> = ({ size = 16, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <circle cx="12" cy="12" r="10" fill={color} />
    <rect x="11" y="7" width="2" height="6" rx="1" fill="#ffffff" />
    <circle cx="12" cy="16" r="1.25" fill="#ffffff" />
  </svg>
);

/* Modern Flat File Document */
export const IconFileText: React.FC<IconProps> = ({ size = 20, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M6 2C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2H6Z"
      fill={color}
    />
    <path d="M14 2V8H20L14 2Z" fill="#ffffff" opacity="0.35" />
    <rect x="8" y="12" width="8" height="2" rx="1" fill="#ffffff" opacity="0.9" />
    <rect x="8" y="16" width="5" height="2" rx="1" fill="#ffffff" opacity="0.9" />
  </svg>
);

/* Modern Flat Hamburger Menu (3 smooth pills) */
export const IconMenu: React.FC<IconProps> = ({ size = 20, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill={color} />
    <rect x="3" y="11" width="18" height="2.5" rx="1.25" fill={color} />
    <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill={color} />
  </svg>
);

/* Modern Flat Close 'X' */
export const IconClose: React.FC<IconProps> = ({ size = 20, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M18.3 5.71C17.91 5.32 17.28 5.32 16.89 5.71L12 10.59L7.11 5.7C6.72 5.31 6.09 5.31 5.7 5.7C5.31 6.09 5.31 6.72 5.7 7.11L10.59 12L5.7 16.89C5.31 17.28 5.31 17.91 5.7 18.3C6.09 18.69 6.72 18.69 7.11 18.3L12 13.41L16.89 18.3C17.28 18.69 17.91 18.69 18.3 18.3C18.69 17.91 18.69 17.28 18.3 16.89L13.41 12L18.3 7.11C18.68 6.73 18.68 6.09 18.3 5.71Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Sidebar Layout */
export const IconSidebar: React.FC<IconProps> = ({ size = 20, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="3.5" fill={color} opacity="0.2" />
    <rect x="3" y="4" width="7" height="16" rx="2" fill={color} />
  </svg>
);

/* Modern Flat Chevron Left */
export const IconChevronLeft: React.FC<IconProps> = ({ size = 18, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat Chevron Right */
export const IconChevronRight: React.FC<IconProps> = ({ size = 18, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M8.59 16.59L10 18L16 12L10 6L8.59 7.41L13.17 12L8.59 16.59Z"
      fill={color}
    />
  </svg>
);

/* Modern Flat User Avatar Icon */
export const IconUser: React.FC<IconProps> = ({ size = 18, className, color = 'currentColor', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <circle cx="12" cy="8" r="4" fill={color} />
    <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20V21H4V20Z" fill={color} />
  </svg>
);
