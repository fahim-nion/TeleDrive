import React from 'react';

interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const Base: React.FC<IconProps & { children: React.ReactNode }> = ({ 
  children, 
  size = 24, 
  color = "currentColor", 
  className = "",
  style
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    style={style}
  >
    {children}
  </svg>
);

export const IconCloud: React.FC<IconProps> = (p) => <Base {...p}><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.8-4.2-4-4.5a7 7 0 1 1-13.7-1.4 5 5 0 1 0-.3 9.9H17.5z"/></Base>;
export const IconFolder: React.FC<IconProps> = (p) => <Base {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Base>;
export const IconDrive: React.FC<IconProps> = (p) => <Base {...p}><path d="M21 12H3"/><path d="M21 6H3"/><path d="M21 18H3"/><path d="M16 6V18"/><path d="M8 6V18"/></Base>;
export const IconImage: React.FC<IconProps> = (p) => <Base {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Base>;
export const IconVideo: React.FC<IconProps> = (p) => <Base {...p}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></Base>;
export const IconMusic: React.FC<IconProps> = (p) => <Base {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></Base>;
export const IconFileText: React.FC<IconProps> = (p) => <Base {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Base>;
export const IconArchive: React.FC<IconProps> = (p) => <Base {...p}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></Base>;
export const IconDownload: React.FC<IconProps> = (p) => <Base {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Base>;
export const IconTrash: React.FC<IconProps> = (p) => <Base {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></Base>;
export const IconRefresh: React.FC<IconProps> = (p) => <Base {...p}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Base>;
export const IconChevronLeft: React.FC<IconProps> = (p) => <Base {...p}><polyline points="15 18 9 12 15 6"/></Base>;
export const IconChevronRight: React.FC<IconProps> = (p) => <Base {...p}><polyline points="9 18 15 12 9 6"/></Base>;
export const IconChevronDown: React.FC<IconProps> = (p) => <Base {...p}><polyline points="6 9 12 15 18 9"/></Base>;
export const IconCheck: React.FC<IconProps> = (p) => <Base {...p}><polyline points="20 6 9 17 4 12"/></Base>;
export const IconCheckCircle: React.FC<IconProps> = (p) => <Base {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Base>;
export const IconShield: React.FC<IconProps> = (p) => <Base {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Base>;
export const IconZap: React.FC<IconProps> = (p) => <Base {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Base>;
export const IconSparkles: React.FC<IconProps> = (p) => <Base {...p}><path d="M12 3l1.912 4.148 4.088 1.912-4.088 1.912L12 15l-1.912-4.148L6 8.94l4.088-1.912L12 3zM5 18l.956 2.074 2.044.956-.956.956L5 24l-.956-2.074L2 21l2.044-.956L5 18z"/></Base>;
export const IconMaximize: React.FC<IconProps> = (p) => <Base {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></Base>;
export const IconSearch: React.FC<IconProps> = (p) => <Base {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Base>;
export const IconFilter: React.FC<IconProps> = (p) => <Base {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Base>;
export const IconSort: React.FC<IconProps> = (p) => <Base {...p}><line x1="18" y1="20" x2="18" y2="10"/><polyline points="14 14 18 10 22 14"/><line x1="6" y1="4" x2="6" y2="14"/><polyline points="2 10 6 14 10 10"/></Base>;
export const IconGrid: React.FC<IconProps> = (p) => <Base {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Base>;
export const IconList: React.FC<IconProps> = (p) => <Base {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Base>;
export const IconInfo: React.FC<IconProps> = (p) => <Base {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Base>;
export const IconCopy: React.FC<IconProps> = (p) => <Base {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Base>;
export const IconExternalLink: React.FC<IconProps> = (p) => <Base {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></Base>;
export const IconPlay: React.FC<IconProps> = (p) => <Base {...p}><polygon points="5 3 19 12 5 21 5 3"/></Base>;
export const IconPause: React.FC<IconProps> = (p) => <Base {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Base>;
export const IconVolume: React.FC<IconProps> = (p) => <Base {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></Base>;
export const IconUploadCloud: React.FC<IconProps> = (p) => <Base {...p}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/></Base>;
export const IconServer: React.FC<IconProps> = (p) => <Base {...p}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></Base>;
export const IconSun: React.FC<IconProps> = (p) => <Base {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></Base>;
export const IconMoon: React.FC<IconProps> = (p) => <Base {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Base>;
export const IconGithub: React.FC<IconProps> = (p) => <Base {...p}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></Base>;
export const IconX: React.FC<IconProps> = (p) => <Base {...p}><path d="M4 4l11.733 16h4.267l-11.733-16z"/><path d="M4 20l6.768-6.768m2.464-2.464l6.768-6.768"/></Base>;
export const IconUser: React.FC<IconProps> = (p) => <Base {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Base>;
export const IconAlertTriangle: React.FC<IconProps> = (p) => <Base {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Base>;
export const IconLayers: React.FC<IconProps> = (p) => <Base {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Base>;
