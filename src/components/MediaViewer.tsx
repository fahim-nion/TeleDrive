import React, { useEffect, useState, useRef } from 'react';
import { downloadFileFromTelegram, getThumbnail, getOptimizedPreview } from '../services/cloud';
import { IconDownload, IconTrash, IconChevronLeft, IconChevronRight } from './Icons';

const MediaViewer: React.FC<any> = ({ files, currentIndex, onClose, onIndexChange, onDelete, onDownload }) => {
  const f = files[currentIndex];
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const touchStart = useRef(0);

  // SWIPE LOGIC
  const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.touches[0].clientX;
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;
    if (diff > 70 && currentIndex < files.length - 1) onIndexChange(currentIndex + 1); // Swipe Left -> Next
    if (diff < -70 && currentIndex > 0) onIndexChange(currentIndex - 1); // Swipe Right -> Prev
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setUrl(null);
      const previewUrl = await getOptimizedPreview(f.messageId);
      if (active) {
        if (previewUrl && !f.isVideo) { setUrl(previewUrl); setLoading(false); }
        else {
          const buf = await downloadFileFromTelegram(f.messageId, () => {});
          if (active) { setUrl(URL.createObjectURL(new Blob([buf], { type: f.mimeType }))); setLoading(false); }
        }
      }
    };
    load();
    return () => { active = false; };
  }, [currentIndex]);

  return (
    <div 
      onTitleStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 3000, display: 'flex', flexDirection: 'column', touchAction: 'pan-y' }}
    >
      <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 3010 }}>
        <button onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 16px', borderRadius: '100px', fontWeight: '800' }}>CLOSE</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onDownload(f)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '10px' }}><IconDownload size={16} /></button>
          <button onClick={() => { if(confirm('Delete?')) onDelete(f.messageId); }} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '10px' }}><IconTrash size={16} /></button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <button onClick={() => onIndexChange(currentIndex - 1)} disabled={currentIndex === 0} className="hide-mobile" style={{ position: 'fixed', left: '20px', top: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', zIndex: 3020, opacity: currentIndex === 0 ? 0 : 1 }}><IconChevronLeft size={30} /></button>
        
        {loading ? <div style={{ color: 'var(--primary)', fontWeight: 800 }}>SYNCING...</div> : (
          f.isVideo ? (
            <video src={url!} controls playsInline controlsList="nodownload" style={{ maxWidth: '100%', maxHeight: '100%', width: '100%' }} autoPlay />
          ) : (
            <img src={url!} className="viewer-image" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )
        )}

        <button onClick={() => onIndexChange(currentIndex + 1)} disabled={currentIndex === files.length - 1} className="hide-mobile" style={{ position: 'fixed', right: '20px', top: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', zIndex: 3020, opacity: currentIndex === files.length - 1 ? 0 : 1 }}><IconChevronRight size={30} /></button>
      </div>
    </div>
  );
};

export default MediaViewer;