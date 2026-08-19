import React from 'react';
import { IconCloud, IconImage, IconVideo } from './Icons';

interface Props {
  accountStats: { total: number, photos: number, videos: number };
}

const StorageMetrics: React.FC<Props> = ({ accountStats }) => {
  const { total: totalBytes, photos: photoBytes, videos: videoBytes } = accountStats;

  // UNIT CONVERTER: Supports MB and GB
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
    <div className="metric-grid" style={{ marginBottom: '48px' }}>
      <div className="metric-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.7, letterSpacing: '1.5px' }}>CLOUD NODES VOLUME</div>
            <div className="total-text" style={{ fontSize: '42px', fontWeight: 800, position: 'relative', zIndex: 2 }}>
                {total.val} <span style={{ fontSize: '18px', opacity: 0.6 }}>{total.unit}</span>
            </div>
          </div>
          <IconCloud size={24} color="rgba(255,255,255,0.4)" />
        </div>
        <div style={{ marginTop: '20px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 2 }}>
          <div style={{ width: `${imgPerc}%`, background: '#fff', boxShadow: '0 0 10px #fff' }} />
          <div style={{ width: `${vidPerc}%`, background: '#F59E0B' }} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <IconImage color="var(--primary)" size={18} />
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)' }}>{imgPerc.toFixed(0)}%</span>
        </div>
        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>PHOTOS</div>
        <div style={{ fontSize: '18px', fontWeight: 800 }}>{photos.val} {photos.unit}</div>
        <div style={{ height: '4px', background: 'var(--accent)', borderRadius: '10px', marginTop: '12px' }}>
          <div style={{ width: `${imgPerc}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px' }} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <IconVideo color="#F59E0B" size={18} />
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#F59E0B' }}>{vidPerc.toFixed(0)}%</span>
        </div>
        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>VIDEOS</div>
        <div style={{ fontSize: '18px', fontWeight: 800 }}>{videos.val} {videos.unit}</div>
        <div style={{ height: '4px', background: 'var(--accent)', borderRadius: '10px', marginTop: '12px' }}>
          <div style={{ width: `${vidPerc}%`, height: '100%', background: '#F59E0B', borderRadius: '10px' }} />
        </div>
      </div>
    </div>
  );
};

export default StorageMetrics;