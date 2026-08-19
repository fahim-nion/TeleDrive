import React from 'react';
import { IconCloud, IconImage, IconVideo } from './Icons';

const StorageMetrics: React.FC<any> = ({ accountStats }) => {
  const { total: totalBytes, photos: photoBytes, videos: videoBytes } = accountStats;
  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1024 ? { val: (mb / 1024).toFixed(2), unit: "GB" } : { val: mb.toFixed(1), unit: "MB" };
  };

  const total = formatSize(totalBytes);
  const imgPerc = totalBytes > 0 ? (photoBytes / totalBytes) * 100 : 0;
  const vidPerc = totalBytes > 0 ? (videoBytes / totalBytes) * 100 : 0;

  return (
    <div className="metric-grid">
      <div className="metric-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.7, letterSpacing: '1.5px' }}>NODE VOLUME</div>
          <IconCloud size={20} color="rgba(255,255,255,0.4)" />
        </div>
        <div style={{ fontSize: '42px', fontWeight: 800 }}>{total.val} <span style={{ fontSize: '18px', opacity: 0.6 }}>{total.unit}</span></div>
        <div style={{ marginTop: '20px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', overflow: 'hidden' }}>
          <div className="bar-fill" style={{ width: `${imgPerc}%`, background: '#fff' }} />
          <div className="bar-fill" style={{ width: `${vidPerc}%`, background: '#F59E0B' }} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <IconImage color="var(--primary)" size={18} style={{ marginBottom: '12px' }} />
        <div style={{ fontSize: '18px', fontWeight: 800 }}>{formatSize(photoBytes).val} {formatSize(photoBytes).unit}</div>
        <div style={{ height: '4px', background: 'var(--accent)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
          <div className="bar-fill" style={{ width: `${imgPerc}%`, height: '100%', background: 'var(--primary)' }} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <IconVideo color="#F59E0B" size={18} style={{ marginBottom: '12px' }} />
        <div style={{ fontSize: '18px', fontWeight: 800 }}>{formatSize(videoBytes).val} {formatSize(videoBytes).unit}</div>
        <div style={{ height: '4px', background: 'var(--accent)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
          <div className="bar-fill" style={{ width: `${vidPerc}%`, height: '100%', background: '#F59E0B' }} />
        </div>
      </div>
    </div>
  );
};

export default StorageMetrics;