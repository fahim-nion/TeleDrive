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
  onToggleSelect?: (e: React.MouseEvent | React.TouchEvent) => void;
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
    }, { rootMargin: '300px' });

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
        return <IconVideo size={28} color="var(--accent-video)" />;
      case 'audio':
        return <IconMusic size={28} color="var(--accent-audio)" />;
      case 'document':
        return <IconFileText size={28} color="var(--accent-doc)" />;
      case 'archive':
        return <IconArchive size={28} color="var(--accent-other)" />;
      default:
        return <IconImage size={28} color="var(--primary)" />;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectMode) {
      e.preventDefault();
      onToggleSelect?.(e);
    } else {
      onClick();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`card cloud-item ${isSelected ? 'selected' : ''}`} 
      style={{ 
        padding: '5px', 
        cursor: 'pointer', 
        position: 'relative',
        borderRadius: '14px',
        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
        transform: isSelected ? 'scale(0.97)' : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }} 
      onClick={handleCardClick}
    >
      {/* Selection Checkbox Pill (Always touch-accessible in top-left) */}
      <div 
        onClick={(e) => { 
          e.stopPropagation(); 
          onToggleSelect?.(e); 
        }}
        className={`item-select-checkbox ${isSelectMode || isSelected ? 'visible' : ''}`}
        title={isSelected ? "Deselect item" : "Select item"}
      >
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '7px',
          background: isSelected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.45)',
          border: isSelected ? '2px solid #FFFFFF' : '1.5px solid rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'all 0.15s ease',
        }}>
          {isSelected && <IconCheck size={14} color="#FFFFFF" />}
        </div>
      </div>

      {/* Desktop Quick Actions on hover (hidden on touch/mobile) */}
      {!isSelectMode && (
        <div className="cloud-item-hover-actions">
          {onQuickDownload && (
            <button 
              className="action-icon-btn" 
              title="Download file" 
              onClick={(e) => { e.stopPropagation(); onQuickDownload(e); }}
            >
              <IconDownload size={13} />
            </button>
          )}
          <button 
            className="action-icon-btn" 
            title="Preview" 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            <IconMaximize size={13} />
          </button>
          {onQuickDelete && (
            <button 
              className="action-icon-btn delete" 
              title="Delete from Telegram" 
              onClick={(e) => { e.stopPropagation(); onQuickDelete(e); }}
            >
              <IconTrash size={13} />
            </button>
          )}
        </div>
      )}

      {/* Media / Thumbnail Square */}
      <div 
        style={{ 
          aspectRatio: '1/1', 
          background: 'var(--surface-secondary)', 
          borderRadius: '10px', 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          position: 'relative',
          width: '100%'
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
              transition: 'transform 0.25s ease',
              display: 'block'
            }} 
          />
        ) : (
          <div style={{ opacity: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            {renderIcon()}
            {file.category === 'image' && file.size > 9.99 * 1024 * 1024 ? (
              <span style={{ 
                fontSize: '8px', 
                fontWeight: 800, 
                color: 'var(--primary)', 
                background: 'var(--primary-light)', 
                padding: '1px 5px', 
                borderRadius: '4px',
                marginTop: '2px'
              }}>
                HD
              </span>
            ) : extension ? (
              <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                {extension}
              </span>
            ) : null}
          </div>
        )}

        {/* Video Duration Badge */}
        {file.isVideo && durationText && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            background: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            fontSize: '8px',
            fontWeight: 800,
            padding: '2px 5px',
            borderRadius: '4px',
            backdropFilter: 'blur(4px)'
          }}>
            {durationText}
          </div>
        )}

        {/* Category Pill for non-images when no thumb exists */}
        {file.category !== 'image' && !thumbUrl && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '7px',
            fontWeight: 800,
            padding: '1px 4px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}>
            {extension || file.category.toUpperCase()}
          </div>
        )}
      </div>

      {/* Meta Footer */}
      <div style={{ padding: '4px 2px 2px 2px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
        <div 
          style={{ 
            fontSize: '10px', 
            fontWeight: 700, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            color: 'var(--text)',
            lineHeight: 1.2,
            marginBottom: '2px',
            minWidth: 0,
            width: '100%'
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
          fontWeight: 700,
          minWidth: 0,
          width: '100%',
          overflow: 'hidden'
        }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{size.val} {size.unit}</span>
          <span className="hide-mobile-extra" style={{ flexShrink: 0 }}>
            {new Date(file.date * 1000).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CloudItem;
