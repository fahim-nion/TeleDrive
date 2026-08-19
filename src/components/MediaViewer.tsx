import React, { useEffect, useState, useRef } from 'react';
import { downloadFileFromTelegram, getThumbnail, getOptimizedPreview } from '../services/cloud';
import { IconDownload, IconTrash, IconChevronLeft, IconChevronRight, IconVideo, IconImage, IconMaximize } from './Icons';

const MediaViewer: React.FC<any> = ({ files, currentIndex, onClose, onIndexChange, onDelete, onDownload }) => {
  const f = files[currentIndex];
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setUrl(null); setZoom(1); setOffset({ x: 0, y: 0 });
      
      // OPTIMIZED VIEWING: Fetch high-quality thumbnail instead of original MB file
      const previewUrl = await getOptimizedPreview(f.messageId);
      
      if (active) {
        if (previewUrl && !f.isVideo) {
          setUrl(previewUrl);
          setLoading(false);
        } else {
          // If no high-res thumb or is video, fallback to full download
          const buf = await downloadFileFromTelegram(f.messageId, () => {});
          if (active) {
            setUrl(URL.createObjectURL(new Blob([buf], { type: f.mimeType })));
            setLoading(false);
          }
        }
      }
    };
    load();
    return () => { active = false; if(url) URL.revokeObjectURL(url); };
  }, [currentIndex]);

  // Fast Carousel: Load adjacent thumbnails
  useEffect(() => {
    const range = 5;
    files.forEach(async (file: any, index: number) => {
      if (Math.abs(index - currentIndex) <= range && !thumbs[file.messageId]) {
        const tUrl = await getThumbnail(file.messageId);
        if (tUrl) setThumbs(prev => ({ ...prev, [file.messageId]: tUrl }));
      }
    });
  }, [currentIndex, files]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 3010 }}>
        <button onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 16px', borderRadius: '100px', fontWeight: '800', cursor: 'pointer', fontSize: '10px' }}>CLOSE</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!f.isVideo && <input className="hide-mobile" type="range" min="1" max="4" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ width: '60px' }} />}
          <button onClick={() => onDownload(f)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 'bold', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px' }}><IconDownload size={14} /></button>
          <button onClick={() => { if(confirm('Delete?')) onDelete(f.messageId); }} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 'bold', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px' }}><IconTrash size={14} /></button>
        </div>
      </div>

      <div 
        style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
        onMouseDown={(e) => { if(zoom > 1) { setIsDragging(true); dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; }}}
        onMouseMove={(e) => { if(isDragging) setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); }}
        onMouseUp={() => setIsDragging(false)}
      >
        <button onClick={() => onIndexChange(currentIndex - 1)} disabled={currentIndex === 0} style={{ position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', width: '40px', height: '60px', borderRadius: '10px', zIndex: 3020, opacity: currentIndex === 0 ? 0 : 1 }}><IconChevronLeft size={20} /></button>
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transition: isDragging ? 'none' : 'transform 0.1s', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '11px' }}>DECRYPTING...</div> : (
            f.isVideo ? <video src={url!} controls playsInline style={{ maxWidth: '100%', maxHeight: '100%' }} autoPlay /> :
            <img src={url!} style={{ maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }} alt="" />
          )}
        </div>
        <button onClick={() => onIndexChange(currentIndex + 1)} disabled={currentIndex === files.length - 1} style={{ position: 'fixed', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', width: '40px', height: '60px', borderRadius: '10px', zIndex: 3020, opacity: currentIndex === files.length - 1 ? 0 : 1 }}><IconChevronRight size={20} /></button>
      </div>

      <div style={{ padding: '10px', background: 'rgba(0,0,0,0.8)', display: 'flex', gap: '6px', justifyContent: 'center', overflowX: 'auto', zIndex: 3010 }}>
        {files.map((thumb: any, i: number) => (
          <div key={thumb.messageId} onClick={() => onIndexChange(i)} style={{ minWidth: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', border: i === currentIndex ? '2px solid var(--primary)' : '2px solid transparent', opacity: i === currentIndex ? 1 : 0.3 }}>
            {thumbs[thumb.messageId] ? <img src={thumbs[thumb.messageId]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{thumb.isVideo ? <IconVideo size={10} color="white" /> : <IconImage size={10} color="white" />}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaViewer;