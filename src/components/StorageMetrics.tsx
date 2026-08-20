import React from 'react';
import { IconCloud, IconImage, IconVideo } from './Icons';

interface Props {
  accountStats: { total: number, photos: number, videos: number };
}

const StorageMetrics: React.FC<Props> = ({ accountStats }) => {
  const { total: totalBytes, photos: photoBytes, videos: videoBytes } = accountStats;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return { val: "0", unit: "MB" };
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return { val: (mb / 1024).toFixed(2), unit: "GB" };
    return { val: mb.toFixed(1), unit: "MB" };
  };

  const total = formatSize(totalBytes);
  const photos = formatSize(photoBytes);
  const videos = formatSize(videoBytes);

  const imgPerc = totalBytes > 0 ? (photoBytes / totalBytes) * 100 : 0;
  const vidPerc = totalBytes > 0 ? (videoBytes / totalBytes) * 100 : 0;

  return (
    <div className="metric-grid">
      {/* Main Volume Card */}
      <div className="metric-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.7, letterSpacing: '1.5px', marginBottom: '8px' }}>STORAGE VOLUME</div>
            <div style={{ fontSize: '42px', fontWeight: 800 }}>{total.val} <span style={{ fontSize: '18px', opacity: 0.6 }}>{total.unit}</span></div>
          </div>
          <IconCloud size={24} color="rgba(255,255,255,0.4)" />
        </div>
        <div style={{ marginTop: '24px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 2 }}>
          <div className="bar-fill" style={{ width: `${imgPerc}%`, background: '#fff', boxShadow: '0 0 10px #fff' }} />
          <div className="bar-fill" style={{ width: `${vidPerc}%`, background: '#F59E0B' }} />
        </div>
      </div>

      {/* Photo Card */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconImage color="var(--primary)" size={20} />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>PHOTOS</div>
          <div style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap' }}>{photos.val} {photos.unit}</div>
        </div>
      </div>

      {/* Video Card */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconVideo color="#F59E0B" size={20} />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>VIDEOS</div>
          <div style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap' }}>{videos.val} {videos.unit}</div>
        </div>
      </div>
    </div>
  );
};

export default StorageMetrics;