import React, { useEffect, useState, useRef } from 'react';
import { CloudFile } from '../types';
import { getThumbnail } from '../services/cloud';
import { IconImage, IconVideo } from './Icons';

interface Props {
  file: CloudFile;
  onClick: () => void;
}

const CloudItem: React.FC<Props> = ({ file, onClick }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !thumbUrl && (file as any).thumbnail) {
        const loadThumb = async () => {
          // Specifically request the "small" (low-res) version for the grid
          const url = await getThumbnail((file as any).thumbnail, 'small');
          setThumbUrl(url);
        };
        loadThumb();
        observer.disconnect();
      }
    }, { 
      // EAGER LOADING: Start downloading when item is 400px away from viewport
      rootMargin: '400px' 
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [file, thumbUrl]);

  const formatDuration = (s?: number) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="card" style={{ padding: '6px', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ aspectRatio: '1/1', background: 'var(--accent)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {!isLoaded && <div className="shimmer" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
        
        {thumbUrl ? (
          <img 
            src={thumbUrl} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isLoaded ? 1 : 0 }} 
            onLoad={() => setIsLoaded(true)}
          />
        ) : (
          <div style={{ opacity: 0.1 }}>
            {file.isVideo ? <IconVideo size={32} color="var(--text)" /> : <IconImage size={32} color="var(--text)" />}
          </div>
        )}

        {file.isVideo && (
          <>
            <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', zIndex: 2 }}>
              {formatDuration(file.duration)}
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%', backdropFilter: 'blur(4px)', zIndex: 2 }}>
              <IconVideo size={14} color="white" />
            </div>
          </>
        )}
      </div>
      <div style={{ fontSize: '10px', fontWeight: '600', padding: '8px 2px 2px 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
        {file.name}
      </div>
    </div>
  );
};

export default CloudItem;