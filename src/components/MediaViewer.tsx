import React, { useEffect, useState } from 'react';
import { downloadFileFromTelegram, getThumbnail } from '../services/cloud';
import { IconDownload, IconTrash, IconChevronLeft, IconChevronRight, IconVideo, IconImage } from './Icons';

const MediaViewer: React.FC<any> = ({ files, currentIndex, onClose, onIndexChange, onDelete, onDownload }) => {
  const f = files[currentIndex];
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setUrl(null);
      const buf = await downloadFileFromTelegram(f.messageId, () => {});
      if (active && buf) {
        setUrl(URL.createObjectURL(new Blob([buf], { type: f.mimeType })));
        setLoading(false);
      }
    };
    load();
    return () => { 
        active = false; 
        if (url) URL.revokeObjectURL(url);
    };
  }, [currentIndex]);

  // SMART CAROUSEL: Only load +/- 2 thumbnails
  useEffect(() => {
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(files.length - 1, currentIndex + 2);
    
    for (let i = start; i <= end; i++) {
        const fileId = files[i].messageId;
        if (!thumbs[fileId]) {
            getThumbnail(fileId).then(tUrl => {
                if (tUrl) setThumbs(prev => ({ ...prev, [fileId]: tUrl }));
            });
        }
    }
  }, [currentIndex, files]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 3010 }}>
        <button onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 16px', borderRadius: '100px', fontWeight: '800' }}>CLOSE</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onDownload(f)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px' }}><IconDownload size={14} /></button>
          <button onClick={() => onDelete(f.messageId)} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px' }}><IconTrash size={14} /></button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <button onClick={() => onIndexChange(currentIndex - 1)} disabled={currentIndex === 0} style={{ position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', width: '40px', height: '60px', zIndex: 3020, opacity: currentIndex === 0 ? 0 : 1 }}><IconChevronLeft size={20} /></button>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <div style={{ color: 'white', fontSize: '11px' }}>DECRYPTING...</div> : (
            f.isVideo ? <video src={url!} controls style={{ maxWidth: '100%', maxHeight: '100%' }} autoPlay /> :
            <img src={url!} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          )}
        </div>
        <button onClick={() => onIndexChange(currentIndex + 1)} disabled={currentIndex === files.length - 1} style={{ position: 'fixed', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', width: '40px', height: '60px', zIndex: 3020, opacity: currentIndex === files.length - 1 ? 0 : 1 }}><IconChevronRight size={20} /></button>
      </div>

      <div style={{ padding: '10px', background: 'rgba(0,0,0,0.8)', display: 'flex', gap: '6px', justifyContent: 'center', overflowX: 'auto' }}>
        {files.map((thumbFile: any, i: number) => (
          <div key={thumbFile.messageId} onClick={() => onIndexChange(i)} style={{ minWidth: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', border: i === currentIndex ? '2px solid var(--primary)' : '2px solid transparent', opacity: i === currentIndex ? 1 : 0.3 }}>
            {thumbs[thumbFile.messageId] ? <img src={thumbs[thumbFile.messageId]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#222' }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaViewer;