import React, { useEffect, useState } from 'react';
import { CloudFile } from '../types';
import { getThumbnail } from '../services/cloud';
import { IconImage, IconVideo } from './Icons';

interface Props {
  file: CloudFile;
  onClick: () => void;
}

const CloudItem: React.FC<Props> = ({ file, onClick }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loadingThumb, setLoadingThumb] = useState(false);

  useEffect(() => {
    const loadThumb = async () => {
      if ((file as any).thumbnail) {
        setLoadingThumb(true);
        const url = await getThumbnail((file as any).thumbnail);
        setThumbUrl(url);
        setLoadingThumb(false);
      }
    };
    loadThumb();
  }, [file]);

  // Helper to format seconds (e.g., 75 -> 01:15)
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card" style={{ padding: '6px', position: 'relative', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      <div 
        onClick={onClick}
        style={{ aspectRatio: '1/1', background: 'var(--accent)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
      >
        {thumbUrl ? (
          <img src={thumbUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        ) : (
          <div style={{ opacity: 0.2 }}>
            {file.isVideo ? <IconVideo size={40} color="var(--text)" /> : <IconImage size={40} color="var(--text)" />}
          </div>
        )}

        {/* Video Duration Badge & Play Icon Overlay */}
        {file.isVideo && (
          <>
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
              {formatDuration(file.duration)}
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <IconVideo size={18} color="white" />
            </div>
          </>
        )}
      </div>
      
      <div style={{ 
        fontSize: '11px', 
        fontWeight: '600', 
        padding: '10px 4px 6px 4px',
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        color: 'var(--text)' 
      }}>
        {file.name}
      </div>
    </div>
  );
};

export default CloudItem;