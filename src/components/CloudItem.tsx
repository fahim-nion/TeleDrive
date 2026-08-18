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
          const url = await getThumbnail((file as any).thumbnail);
          setThumbUrl(url);
        };
        loadThumb();
        observer.disconnect();
      }
    }, { 
      // PRE-FETCH: Start loading when user is within 800px of the image
      rootMargin: '800px' 
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [file, thumbUrl]);

  return (
    <div ref={containerRef} className="card" style={{ padding: '6px', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ aspectRatio: '1/1', background: 'var(--accent)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {!isLoaded && <div className="shimmer" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
        
        {thumbUrl ? (
          <img 
            src={thumbUrl} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isLoaded ? 1 : 0, transition: 'opacity 0.2s' }} 
            onLoad={() => setIsLoaded(true)}
          />
        ) : (
          <div style={{ opacity: 0.1 }}>
            {file.isVideo ? <IconVideo size={32} color="var(--text)" /> : <IconImage size={32} color="var(--text)" />}
          </div>
        )}

        {file.isVideo && (
          <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', zIndex: 2 }}>
            {Math.floor(file.duration! / 60)}:{(file.duration! % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
      <div style={{ fontSize: '9px', fontWeight: '600', padding: '6px 2px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
        {file.name}
      </div>
    </div>
  );
};

export default CloudItem;