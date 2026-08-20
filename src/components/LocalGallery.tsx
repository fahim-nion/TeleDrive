import React, { useState } from 'react';
import { LocalFile, CloudFile } from '../types';
import { uploadToTelegram } from '../services/upload';
import StorageMetrics from './StorageMetrics';
import { IconSparkles, IconRefresh, IconCheck } from './Icons';
import { Api } from 'telegram';
// @ts-ignore
import heic2any from "heic2any";

interface Props {
  cloudFiles: CloudFile[];
  accountStats: { total: number, photos: number, videos: number };
  onUploadSuccess: (file: CloudFile) => void;
}

const LocalGallery: React.FC<Props> = ({ accountStats, onUploadSuccess }) => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    // Process files one by one to handle potential HEIC conversion
    for (const f of selected) {
      let previewUrl = URL.createObjectURL(f);

      // HEIC DETECTION & CONVERSION
      if (f.name.toLowerCase().endsWith('.heic')) {
        try {
          const convertedBlob = await heic2any({
            blob: f,
            toType: "image/jpeg",
            quality: 0.6
          });
          previewUrl = URL.createObjectURL(Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob);
        } catch (err) {
          console.error("HEIC conversion failed:", err);
        }
      }

      const newFile: LocalFile = {
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        previewUrl,
        name: f.name,
        size: f.size,
        type: f.type,
        status: 'IDLE' as any,
        progress: 0
      };
      setFiles(prev => [newFile, ...prev]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);
    
    const pending = files.filter(x => x.status === 'IDLE');
    const totalCount = pending.length;
    
    for (let i = 0; i < totalCount; i++) {
      const f = pending[i];
      try {
        const result = await uploadToTelegram(f.file, p => {
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'UPLOADING', progress: p } : x));
          // Calculate overall batch progress
          setOverallProgress(((i / totalCount) * 100) + (p / totalCount));
        }) as Api.Message;

        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'COMPLETED', progress: 100 } : x));
        
        // Pass metadata to Dashboard for instant Cloud Tab update
        onUploadSuccess({
          messageId: result.id,
          name: f.name,
          size: f.size,
          date: Math.floor(Date.now() / 1000),
          mimeType: f.type,
          downloadStatus: 'IDLE',
          downloadProgress: 0,
          isVideo: f.type.startsWith('video'),
          duration: 0
        });
      } catch (err) {
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'FAILED' } : x));
      }
    }
    setIsUploading(false);
    setOverallProgress(0);
  };

  const sharedBtnStyle: React.CSSProperties = {
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    fontWeight: '800',
    fontSize: '11px',
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    margin: 0
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      <StorageMetrics accountStats={accountStats} />
      
      <div className="glass-card" style={{ padding: '32px', marginBottom: '40px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800 }}>Upload Hub</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Stream original nodes to the cloud.</p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1.5fr', 
          gap: '12px', 
          marginTop: '24px' 
        }}>
          <label style={{ 
            ...sharedBtnStyle, 
            background: 'var(--surface)', 
            color: 'var(--text)', 
            border: '1px solid var(--border)' 
          }}>
            SELECT MEDIA
            <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          
          <button 
            onClick={startUpload} 
            disabled={isUploading || !files.some(f => f.status === 'IDLE')}
            style={{ 
              ...sharedBtnStyle, 
              background: 'var(--primary)', 
              color: '#FFFFFF', 
              opacity: (isUploading || !files.some(f => f.status === 'IDLE')) ? 0.5 : 1,
              gap: '10px'
            }}
          >
            {isUploading ? <IconRefresh className="spin" size={16} /> : <IconSparkles size={14} />}
            UPLOAD {files.filter(f => f.status === 'IDLE').length || ''}
          </button>
        </div>

        {isUploading && (
          <div style={{ marginTop: '24px', height: '6px', background: 'var(--accent)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${overallProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      <div className="gallery-grid">
        {files.map(f => (
          <div key={f.id} className="card" style={{ padding: '6px', position: 'relative', borderRadius: '20px' }}>
            {f.status === 'IDLE' && (
              <button className="remove-x" onClick={() => removeFile(f.id)}>✕</button>
            )}
            <div style={{ aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg)' }}>
              <img src={f.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: f.status === 'UPLOADING' ? 0.4 : 1 }} />
            </div>
            {f.status === 'UPLOADING' && <div style={{ height: '3px', background: 'var(--primary)', width: `${f.progress}%`, marginTop: '6px' }} />}
            {f.status === 'COMPLETED' && (
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--success)', color: 'white', padding: '4px', borderRadius: '50%', display: 'flex' }}>
                <IconCheck size={10} />
              </div>
            )}
            {f.status === 'FAILED' && (
              <div style={{ color: 'var(--error)', fontSize: '9px', fontWeight: 'bold', marginTop: '5px', textAlign: 'center' }}>FAILED</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocalGallery;