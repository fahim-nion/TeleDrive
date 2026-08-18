import React from 'react';

const Base = ({ children, size = 24, color = "currentColor", className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);

export const IconCloud = (p: any) => <Base {...p}><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.8-4.2-4-4.5a7 7 0 1 1-13.7-1.4 5 5 0 1 0-.3 9.9H17.5z"/></Base>;
export const IconFolder = (p: any) => <Base {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Base>;
export const IconDrive = (p: any) => <Base {...p}><path d="M21 12H3"/><path d="M21 6H3"/><path d="M21 18H3"/><path d="M16 6V18"/><path d="M8 6V18"/></Base>;
export const IconImage = (p: any) => <Base {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Base>;
export const IconVideo = (p: any) => <Base {...p}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></Base>;
export const IconDownload = (p: any) => <Base {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Base>;
export const IconTrash = (p: any) => <Base {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></Base>;
export const IconRefresh = (p: any) => <Base {...p}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Base>;
export const IconChevronLeft = (p: any) => <Base {...p}><polyline points="15 18 9 12 15 6"/></Base>;
export const IconChevronRight = (p: any) => <Base {...p}><polyline points="9 18 15 12 9 6"/></Base>;
export const IconCheck = (p: any) => <Base {...p}><polyline points="20 6 9 17 4 12"/></Base>;
export const IconShield = (p: any) => <Base {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Base>;
export const IconZap = (p: any) => <Base {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Base>;
export const IconSparkles = (p: any) => <Base {...p}><path d="M12 3l1.912 4.148 4.088 1.912-4.088 1.912L12 15l-1.912-4.148L6 8.94l4.088-1.912L12 3zM5 18l.956 2.074 2.044.956-.956.956L5 24l-.956-2.074L2 21l2.044-.956L5 18z"/></Base>;
export const IconMaximize = (p: any) => <Base {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></Base>;
export const IconGithub = (p: any) => <Base {...p}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></Base>;
export const IconX = (p: any) => <Base {...p}><path d="M4 4l11.733 16h4.267l-11.733-16z"/><path d="M4 20l6.768-6.768m2.464-2.464l6.768-6.768"/></Base>;
export const IconUser = (p: any) => <Base {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Base>;