import React, { useEffect, useState, useRef } from 'react';
import { downloadFileFromTelegram, getThumbnail, getOptimizedPreview } from '../services/cloud';
import { 
  IconDownload, 
  IconTrash, 
  IconChevronLeft, 
  IconChevronRight, 
  IconVideo, 
  IconImage, 
  IconMusic,
  IconFileText,
  IconArchive,
  IconInfo,
  IconCheck,
  IconX 
} from './Icons';
import { CloudFile } from '../types';
import { formatBytes } from './StorageMetrics';

interface Props {
  files: CloudFile[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDelete: (id: number) => Promise<void>;
  onDownload: (file: CloudFile) => Promise<void>;
}

const MediaViewer: React.FC<Props> = ({ 
  files, 
  currentIndex, 
  onClose, 
  onIndexChange, 
  onDelete, 
  onDownload 
}) => {
  const f = files[currentIndex];
  const [url, setUrl] = useState<string | null>(null);
  const [isOriginal, setIsOriginal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const touchStart = useRef(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && currentIndex < files.length - 1) {
        onIndexChange(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, files.length, onClose, onIndexChange]);

  // Load media sequence
  useEffect(() => {
    let active = true;
    const loadSequence = async () => {
      setLoading(true);
      setUrl(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsOriginal(false);
      setDownloadProgress(null);

      // Only attempt direct media stream for image/video/audio
      if (f.category === 'image') {
        const previewUrl = await getOptimizedPreview(f.messageId);
        if (active) {
          if (previewUrl) {
            setUrl(previewUrl);
            setLoading(false);

            // Background raw quality download
            setTimeout(async () => {
              if (!active) return;
              try {
                const buf = await downloadFileFromTelegram(f.messageId, () => {});
                if (active && buf) {
                  const originalUrl = URL.createObjectURL(new Blob([buf], { type: f.mimeType }));
                  setUrl(originalUrl);
                  setIsOriginal(true);
                  if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                }
              } catch (e) {
                console.warn("Background raw quality fetch failed", e);
              }
            }, 300);
          } else {
            // Direct download
            const buf = await downloadFileFromTelegram(f.messageId, (p) => {
              if (active) setDownloadProgress(p);
            });
            if (active && buf) {
              setUrl(URL.createObjectURL(new Blob([buf], { type: f.mimeType })));
              setLoading(false);
              setIsOriginal(true);
            }
          }
        }
      } else if (f.category === 'video' || f.category === 'audio') {
        const buf = await downloadFileFromTelegram(f.messageId, (p) => {
          if (active) setDownloadProgress(p);
        });
        if (active && buf) {
          setUrl(URL.createObjectURL(new Blob([buf], { type: f.mimeType })));
          setLoading(false);
          setIsOriginal(true);
        }
      } else {
        // Document / Archive: No inline streaming needed, ready to download
        setLoading(false);
      }
    };

    loadSequence();
    return () => {
      active = false;
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [currentIndex]);

  // Load neighboring thumbnails
  useEffect(() => {
    const range = 4;
    files.forEach(async (file, index) => {
      if (Math.abs(index - currentIndex) <= range && !thumbs[file.messageId]) {
        const tUrl = await getThumbnail(file.messageId);
        if (tUrl) setThumbs(prev => ({ ...prev, [file.messageId]: tUrl }));
      }
    });
  }, [currentIndex, files]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 60 && currentIndex < files.length - 1) onIndexChange(currentIndex + 1);
    if (diff < -60 && currentIndex > 0) onIndexChange(currentIndex - 1);
  };

  const size = formatBytes(f.size);
  const dateStr = new Date(f.date * 1000).toLocaleString();

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(5, 7, 12, 0.95)', 
      zIndex: 3000, 
      display: 'flex', 
      flexDirection: 'column',
      backdropFilter: 'blur(16px)'
    }}>
      {/* Top Header */}
      <div style={{ 
        padding: '10px 16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'rgba(0,0,0,0.75)', 
        zIndex: 3010,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left: Close & File Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <button 
            onClick={onClose} 
            style={{ 
              color: 'white', 
              background: 'rgba(255,255,255,0.12)', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '100px', 
              fontWeight: 800, 
              cursor: 'pointer', 
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0
            }}
          >
            <IconX size={14} /> <span className="hide-mobile">CLOSE</span>
          </button>

          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ 
              color: 'white', 
              fontSize: '12px', 
              fontWeight: 800, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              maxWidth: '220px'
            }}>
              {f.name}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              {size.val} {size.unit} • {currentIndex + 1} of {files.length}
            </div>
          </div>
        </div>

        {/* Center: Quality / Decrypting indicator */}
        <div className="hide-mobile-extra" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!loading && f.category === 'image' && (
            <div style={{ 
              background: isOriginal ? 'var(--success)' : 'var(--primary)', 
              color: 'white', 
              fontSize: '9px', 
              fontWeight: 900, 
              padding: '3px 10px', 
              borderRadius: '100px', 
              letterSpacing: '0.5px' 
            }}>
              {isOriginal ? 'RAW (ORIGINAL)' : 'SHARPENING...'}
            </div>
          )}

          {downloadProgress !== null && downloadProgress < 100 && (
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.25)', 
              color: 'var(--primary)', 
              fontSize: '10px', 
              fontWeight: 800, 
              padding: '4px 12px', 
              borderRadius: '100px' 
            }}>
              FETCHING: {downloadProgress}%
            </div>
          )}
        </div>

        {/* Right Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Zoom Slider for images (Desktop only) */}
          {f.category === 'image' && (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                style={{ width: '60px', accentColor: 'var(--primary)' }} 
                title={`Zoom: ${Math.round(zoom * 100)}%`}
              />
            </div>
          )}

          {/* Info toggle */}
          <button 
            onClick={() => setShowInfo(!showInfo)} 
            style={{ 
              background: showInfo ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
              color: 'white', 
              border: 'none', 
              padding: '7px 10px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="File details"
          >
            <IconInfo size={15} />
          </button>

          {/* Download button */}
          <button 
            onClick={() => onDownload(f)} 
            style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '7px 12px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 800,
              fontSize: '11px'
            }}
            title="Download file"
          >
            <IconDownload size={14} /> <span className="hide-mobile">DOWNLOAD</span>
          </button>

          {/* Delete button */}
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              color: '#EF4444', 
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              padding: '7px 10px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Delete file"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 3500 }}>
          <div className="modal-content" style={{ background: '#161B22', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>Delete File?</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
              Delete "{f.name}" permanently from your Telegram Cloud?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button 
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await onDelete(f.messageId);
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#EF4444', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Media Stage */}
      <div 
        style={{ 
          flex: 1, 
          position: 'relative', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'hidden', 
          touchAction: 'none' 
        }}
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => { 
          if (zoom > 1) { 
            setIsDragging(true); 
            dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; 
          }
        }}
        onMouseMove={(e) => { 
          if (isDragging) setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); 
        }}
        onMouseUp={() => setIsDragging(false)}
      >
        {/* Previous Button */}
        <button 
          onClick={() => onIndexChange(currentIndex - 1)} 
          disabled={currentIndex === 0} 
          className="viewer-nav-btn prev"
          style={{ 
            opacity: currentIndex === 0 ? 0.2 : 1, 
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <IconChevronLeft size={24} />
        </button>

        {/* Media Container */}
        <div style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, 
          transition: isDragging ? 'none' : 'transform 0.15s ease-out', 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '13px', letterSpacing: '1px', marginBottom: '8px' }}>
                DECRYPTING FROM MTPROTO NODES...
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                Fetching direct WebSocket chunks
              </div>
            </div>
          ) : f.category === 'video' ? (
            <video 
              src={url!} 
              controls 
              playsInline 
              style={{ maxWidth: '90%', maxHeight: '85%', borderRadius: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
              autoPlay 
            />
          ) : f.category === 'audio' ? (
            <div style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '24px', 
              padding: '40px', 
              textAlign: 'center',
              maxWidth: '420px',
              width: '100%'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.2)', 
                color: 'var(--accent-audio)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 20px auto' 
              }}>
                <IconMusic size={40} />
              </div>
              <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>{f.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '24px' }}>{size.val} {size.unit}</p>
              <audio src={url!} controls autoPlay style={{ width: '100%' }} />
            </div>
          ) : f.category === 'document' || f.category === 'archive' || f.category === 'other' ? (
            <div style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '24px', 
              padding: '48px 36px', 
              textAlign: 'center',
              maxWidth: '440px',
              width: '100%',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '24px', 
                background: f.category === 'document' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(236, 72, 153, 0.15)', 
                color: f.category === 'document' ? 'var(--accent-doc)' : 'var(--accent-other)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 20px auto' 
              }}>
                {f.category === 'document' ? <IconFileText size={40} /> : <IconArchive size={40} />}
              </div>
              <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, wordBreak: 'break-all' }}>
                {f.name}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '28px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                <span>{size.val} {size.unit}</span> • <span>{f.mimeType}</span>
              </div>
              <button 
                onClick={() => onDownload(f)}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '14px', 
                  border: 'none', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  fontWeight: 800, 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)'
                }}
              >
                <IconDownload size={16} /> DOWNLOAD ORIGINAL FILE
              </button>
            </div>
          ) : (
            <img 
              src={url!} 
              alt={f.name}
              style={{ 
                maxWidth: '90%', 
                maxHeight: '85%', 
                pointerEvents: 'none', 
                objectFit: 'contain',
                borderRadius: '8px',
                imageRendering: isOriginal ? 'auto' : 'high-quality'
              }} 
            />
          )}
        </div>

        {/* Next Button */}
        <button 
          onClick={() => onIndexChange(currentIndex + 1)} 
          disabled={currentIndex === files.length - 1} 
          className="viewer-nav-btn next"
          style={{ 
            opacity: currentIndex === files.length - 1 ? 0.2 : 1, 
            cursor: currentIndex === files.length - 1 ? 'not-allowed' : 'pointer'
          }}
        >
          <IconChevronRight size={24} />
        </button>

        {/* Info Drawer */}
        {showInfo && (
          <div className="viewer-info-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>FILE METRICS</span>
              <button 
                onClick={() => setShowInfo(false)} 
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}
              >
                <IconX size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Name</span>
                <span style={{ fontWeight: 700, wordBreak: 'break-all' }}>{f.name}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Size</span>
                <span style={{ fontWeight: 700 }}>{size.val} {size.unit} ({f.size.toLocaleString()} bytes)</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>MIME Type</span>
                <span style={{ fontWeight: 700 }}>{f.mimeType}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Uploaded</span>
                <span style={{ fontWeight: 700 }}>{dateStr}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Telegram Message ID</span>
                <span style={{ fontWeight: 700 }}>#{f.messageId}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>Storage Engine</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Saved Messages Cloud</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Carousel Filmstrip */}
      <div style={{ 
        padding: '10px 14px', 
        background: 'rgba(0,0,0,0.85)', 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        zIndex: 3010,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        width: '100%',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch'
      }}>
        {files.map((item, i) => (
          <div 
            key={item.messageId} 
            onClick={() => onIndexChange(i)} 
            style={{ 
              minWidth: '40px', 
              height: '40px', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              border: i === currentIndex ? '2px solid var(--primary)' : '2px solid transparent', 
              opacity: i === currentIndex ? 1 : 0.35, 
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              background: '#222'
            }}
          >
            {thumbs[item.messageId] ? (
              <img src={thumbs[item.messageId]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.category === 'video' ? <IconVideo size={14} color="white" /> :
                 item.category === 'audio' ? <IconMusic size={14} color="white" /> :
                 item.category === 'document' ? <IconFileText size={14} color="white" /> :
                 <IconImage size={14} color="white" />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaViewer;
