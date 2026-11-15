import React, { useState } from 'react';
import { 
  IconCloud, 
  IconImage, 
  IconVideo, 
  IconFileText, 
  IconMusic, 
  IconRefresh, 
  IconShield, 
  IconZap,
  IconCheckCircle 
} from './Icons';
import { StorageMetricsData, FileCategory } from '../types';

interface Props {
  metrics: StorageMetricsData;
  onRefreshMetrics?: () => Promise<void>;
  onSelectCategory?: (cat: FileCategory) => void;
}

export const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return { val: '0', unit: 'MB' };
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 3 ? 2 : 1)).toString();
  return { val, unit: sizes[i] };
};

const StorageMetrics: React.FC<Props> = ({ 
  metrics, 
  onRefreshMetrics, 
  onSelectCategory 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const {
    totalBytes,
    photoBytes,
    videoBytes,
    docBytes,
    audioBytes,
    otherBytes,
    totalCount,
    photoCount,
    videoCount,
    docCount,
    audioCount,
    otherCount,
    isScanning,
  } = metrics;

  const total = formatBytes(totalBytes);
  const photos = formatBytes(photoBytes);
  const videos = formatBytes(videoBytes);
  const docs = formatBytes(docBytes);
  const audio = formatBytes(audioBytes);

  // Accurate percentages
  const safeTotal = totalBytes > 0 ? totalBytes : 1;
  const photoPerc = totalBytes > 0 ? (photoBytes / safeTotal) * 100 : 0;
  const videoPerc = totalBytes > 0 ? (videoBytes / safeTotal) * 100 : 0;
  const docPerc = totalBytes > 0 ? (docBytes / safeTotal) * 100 : 0;
  const audioPerc = totalBytes > 0 ? (audioBytes / safeTotal) * 100 : 0;
  const otherPerc = totalBytes > 0 ? (otherBytes / safeTotal) * 100 : 0;

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRefreshing || !onRefreshMetrics) return;
    setIsRefreshing(true);
    try {
      await onRefreshMetrics();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div style={{ marginBottom: '36px' }}>
      {/* 1. Main Grid */}
      <div className="metric-grid">
        {/* Main Hero Card */}
        <div className="metric-hero-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', opacity: 0.85 }}>
                  TOTAL STORAGE VOLUME
                </span>
                <span style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  padding: '2px 8px', 
                  borderRadius: '100px', 
                  fontSize: '9px', 
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} className="pulse" />
                  UNLIMITED
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' }}>
                  {total.val}
                </span>
                <span style={{ fontSize: '20px', fontWeight: 700, opacity: 0.85 }}>
                  {total.unit}
                </span>
              </div>

              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px', fontWeight: 600 }}>
                {totalCount} cloud {totalCount === 1 ? 'item' : 'items'} synced to Saved Messages
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                background: 'rgba(255, 255, 255, 0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backdropFilter: 'blur(8px)'
              }}>
                <IconCloud size={24} color="#FFFFFF" />
              </div>

              {onRefreshMetrics && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || isScanning}
                  title="Recalculate Storage Metrics"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backdropFilter: 'blur(8px)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                >
                  <IconRefresh size={12} className={isRefreshing || isScanning ? 'spin' : ''} />
                  {isRefreshing || isScanning ? 'SCANNING...' : 'RE-SYNC'}
                </button>
              )}
            </div>
          </div>

          {/* Segmented Volume Bar */}
          <div style={{ marginTop: '24px', position: 'relative', zIndex: 2 }}>
            <div className="segmented-bar">
              {photoPerc > 0 && (
                <div 
                  className="segment-fill" 
                  style={{ width: `${photoPerc}%`, background: '#FFFFFF', boxShadow: '0 0 10px rgba(255,255,255,0.7)' }}
                  onMouseEnter={() => setActiveTooltip(`Photos: ${photos.val} ${photos.unit} (${photoPerc.toFixed(1)}%)`)}
                  onMouseLeave={() => setActiveTooltip(null)}
                />
              )}
              {videoPerc > 0 && (
                <div 
                  className="segment-fill" 
                  style={{ width: `${videoPerc}%`, background: '#FBBF24' }}
                  onMouseEnter={() => setActiveTooltip(`Videos: ${videos.val} ${videos.unit} (${videoPerc.toFixed(1)}%)`)}
                  onMouseLeave={() => setActiveTooltip(null)}
                />
              )}
              {docPerc > 0 && (
                <div 
                  className="segment-fill" 
                  style={{ width: `${docPerc}%`, background: '#38BDF8' }}
                  onMouseEnter={() => setActiveTooltip(`Documents: ${docs.val} ${docs.unit} (${docPerc.toFixed(1)}%)`)}
                  onMouseLeave={() => setActiveTooltip(null)}
                />
              )}
              {audioPerc > 0 && (
                <div 
                  className="segment-fill" 
                  style={{ width: `${audioPerc}%`, background: '#34D399' }}
                  onMouseEnter={() => setActiveTooltip(`Audio: ${audio.val} ${audio.unit} (${audioPerc.toFixed(1)}%)`)}
                  onMouseLeave={() => setActiveTooltip(null)}
                />
              )}
              {otherPerc > 0 && (
                <div 
                  className="segment-fill" 
                  style={{ width: `${otherPerc}%`, background: '#F472B6' }}
                  onMouseEnter={() => setActiveTooltip(`Other: ${otherPerc.toFixed(1)}%`)}
                  onMouseLeave={() => setActiveTooltip(null)}
                />
              )}
            </div>

            {/* Hover Tooltip or Segment Legend */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '10px', 
              fontSize: '10px', 
              fontWeight: 700, 
              opacity: 0.9 
            }}>
              {activeTooltip ? (
                <span style={{ color: '#FFFFFF' }}>{activeTooltip}</span>
              ) : (
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF' }} /> Photos ({photoPerc.toFixed(0)}%)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FBBF24' }} /> Videos ({videoPerc.toFixed(0)}%)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8' }} /> Docs ({docPerc.toFixed(0)}%)
                  </span>
                </div>
              )}
              <span style={{ opacity: 0.7 }}>Telegram MTProto</span>
            </div>
          </div>
        </div>

        {/* 2. Photo Category Card */}
        <div 
          className="metric-stat-card" 
          onClick={() => onSelectCategory && onSelectCategory('image')}
          title="Filter photos in Cloud Stream"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '12px', 
              background: 'rgba(139, 92, 246, 0.12)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <IconImage color="var(--accent-photo)" size={18} />
            </div>
            <span className="badge badge-photo">{photoCount} {photoCount === 1 ? 'file' : 'files'}</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
              PHOTOS & IMAGES
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
              {photos.val} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{photos.unit}</span>
            </div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-photo)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{photoPerc.toFixed(1)}% of storage</span> • <span>Filter ↗</span>
          </div>
        </div>

        {/* 3. Video Category Card */}
        <div 
          className="metric-stat-card" 
          onClick={() => onSelectCategory && onSelectCategory('video')}
          title="Filter videos in Cloud Stream"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '12px', 
              background: 'rgba(245, 158, 11, 0.12)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <IconVideo color="var(--accent-video)" size={18} />
            </div>
            <span className="badge badge-video">{videoCount} {videoCount === 1 ? 'file' : 'files'}</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
              VIDEOS & CLIPS
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
              {videos.val} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{videos.unit}</span>
            </div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-video)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{videoPerc.toFixed(1)}% of storage</span> • <span>Filter ↗</span>
          </div>
        </div>

        {/* 4. Documents & Files Card */}
        <div 
          className="metric-stat-card" 
          onClick={() => onSelectCategory && onSelectCategory('document')}
          title="Filter documents in Cloud Stream"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '12px', 
              background: 'rgba(14, 165, 233, 0.12)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <IconFileText color="var(--accent-doc)" size={18} />
            </div>
            <span className="badge badge-doc">{docCount + audioCount + otherCount} files</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
              DOCUMENTS & OTHERS
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
              {docs.val} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{docs.unit}</span>
            </div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-doc)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{(docPerc + audioPerc + otherPerc).toFixed(1)}% of storage</span> • <span>Filter ↗</span>
          </div>
        </div>
      </div>

      {/* Cloud Value Advantage Banner */}
      <div className="glass-card" style={{ 
        padding: '12px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconShield size={16} color="var(--primary)" />
          <span>Telegram Decentralized MTProto Cloud</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
            <IconCheckCircle size={14} /> Zero Subscription ($0/mo)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconZap size={14} color="var(--accent-video)" /> 2GB Max Per File
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconCloud size={14} color="var(--primary)" /> Unlimited Lifetime Storage
          </span>
        </div>
      </div>
    </div>
  );
};

export default StorageMetrics;
