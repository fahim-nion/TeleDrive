import React, { useEffect, useState, useRef } from 'react';
import { CloudFile } from '../types';
import { getThumbnail } from '../services/cloud';
import { 
  IconImage, 
  IconVideo, 
  IconMusic, 
  IconFileText, 
  IconArchive, 
  IconDownload, 
  IconTrash, 
  IconMaximize,
  IconCheck 
} from './Icons';
import { formatBytes } from './StorageMetrics';

interface Props {
  file: CloudFile;
  isSelected?: boolean;
  isSelectMode?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
  onClick: () => void;
  onQuickDownload?: (e: React.MouseEvent) => void;
  onQuickDelete?: (e: React.MouseEvent) => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const CloudItem: React.FC<Props> = ({ 
  file, 
  isSelected = false,
  isSelectMode = false,
  onToggleSelect,
  onClick,
  onQuickDownload,
  onQuickDelete
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !thumbUrl) {
        const load = async () => {
          const url = await getThumbnail(file.messageId);
          if (isMounted && url) {
            setThumbUrl(url);
          }
        };
        load();
        observer.disconnect();
      }
    }, { rootMargin: '250px' });

    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      isMounted = false;
      observer.disconnect();
      if (thumbUrl && thumbUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbUrl);
      }
    };
  }, [file.messageId, thumbUrl]);

  const size = formatBytes(file.size);
  const durationText = formatDuration(file.duration);
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : '';

  const renderIcon = () => {
    switch (file.category) {
      case 'video':
        return <IconVideo size={32} color="var(--accent-video)" />;
      case 'audio':
        return <IconMusic size={32} color="var(--accent-audio)" />;
      case 'document':
        return <IconFileText size={32} color="var(--accent-doc)" />;
      case 'archive':
        return <IconArchive size={32} color="var(--accent-other)" />;
      default:
        return <IconImage size={32} color="var(--primary)" />;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="card cloud-item" 
      style={{ 
        padding: '6px', 
        cursor: 'pointer', 
        position: 'relative',
        borderRadius: '16px',
        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
        transform: isSelected ? 'scale(0.98)' : 'none',
      }} 
      onClick={isSelectMode && onToggleSelect ? onToggleSelect : onClick}
    >
      {/* Checkbox (visible in select mode or on hover) */}
      {(isSelectMode || isSelected) && (
        <div 
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(e); }}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            background: isSelected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.5)',
            border: '2px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          {isSelected && <IconCheck size={14} color="#FFFFFF" />}
        </div>
      )}

      {/* Quick Action buttons on hover */}
      {!isSelectMode && (
        <div className="cloud-item-hover-actions">
          {onQuickDownload && (
            <button 
              className="action-icon-btn" 
              title="Download file" 
              onClick={(e) => { e.stopPropagation(); onQuickDownload(e); }}
            >
              <IconDownload size={14} />
            </button>
          )}
          <button 
            className="action-icon-btn" 
            title="Preview" 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            <IconMaximize size={14} />
          </button>
          {onQuickDelete && (
            <button 
              className="action-icon-btn delete" 
              title="Delete from Telegram" 
              onClick={(e) => { e.stopPropagation(); onQuickDelete(e); }}
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>
      )}

      {/* Media / Thumbnail Box */}
      <div 
        style={{ 
          aspectRatio: '1/1', 
          background: 'var(--surface-secondary)', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          position: 'relative' 
        }}
      >
        {thumbUrl ? (
          <img 
            src={thumbUrl} 
            alt={file.name} 
            loading="lazy"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }} 
          />
        ) : (
          <div style={{ opacity: 0.7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            {renderIcon()}
            {extension && (
              <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                {extension}
              </span>
            )}
          </div>
        )}

        {/* Video Duration Badge */}
        {file.isVideo && durationText && (
          <div style={{
            position: 'absolute',
            bottom: '6px',
            right: '6px',
            background: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            fontSize: '9px',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: '4px',
            backdropFilter: 'blur(4px)'
          }}>
            {durationText}
          </div>
        )}

        {/* Category Pill for non-images */}
        {file.category !== 'image' && !thumbUrl && (
          <div style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '8px',
            fontWeight: 800,
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}>
            {extension || file.category.toUpperCase()}
          </div>
        )}
      </div>

      {/* Meta Footer */}
      <div style={{ padding: '8px 4px 2px 4px' }}>
        <div 
          style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            color: 'var(--text)',
            marginBottom: '2px'
          }}
          title={file.name}
        >
          {file.name}
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '9px', 
          color: 'var(--text-muted)', 
          fontWeight: 700 
        }}>
          <span>{size.val} {size.unit}</span>
          <span>{new Date(file.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
};

export default CloudItem;
