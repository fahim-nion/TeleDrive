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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !thumbUrl) {
        const load = async () => {
          const url = await getThumbnail(file.messageId);
          setThumbUrl(url);
        };
        load();
        observer.disconnect();
      }
    }, { rootMargin: '200px' });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
        observer.disconnect();
        // REVOCATION: Clean up memory when component is destroyed
        if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    };
  }, [file.messageId, thumbUrl]);

  return (
    <div ref={containerRef} className="card" style={{ padding: '6px', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ aspectRatio: '1/1', background: 'var(--accent)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {thumbUrl ? (
          <img src={thumbUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ opacity: 0.1 }}>
            {file.isVideo ? <IconVideo size={32} color="var(--text)" /> : <IconImage size={32} color="var(--text)" />}
          </div>
        )}
      </div>
      <div style={{ fontSize: '10px', fontWeight: '600', padding: '8px 2px 2px 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
        {file.name}
      </div>
    </div>
  );
};

export default CloudItem;