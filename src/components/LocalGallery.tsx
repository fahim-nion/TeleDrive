import React, { useState } from 'react';
import { LocalFile, CloudFile } from '../types';
import { uploadToTelegram } from '../services/upload';
import StorageMetrics from './StorageMetrics';
import { IconSparkles, IconRefresh, IconCheck, IconTrash } from './Icons';
import { Api } from 'telegram';
// @ts-ignore
import heic2any from "heic2any";

const LocalGallery: React.FC<any> = ({ accountStats, onUploadSuccess }) => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    const newFiles = await Promise.all(selected.map(async f => {
      let previewUrl = URL.createObjectURL(f);
      
      // HEIC SUPPORT: Convert to JPEG for browser preview
      if (f.name.toLowerCase().endsWith('.heic')) {
        try {
          const blob = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.7 }) as Blob;
          previewUrl = URL.createObjectURL(blob);
        } catch (e) { console.warn("HEIC Decode failed", e); }
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        file: f, previewUrl, name: f.name, size: f.size, type: f.type,
        status: 'IDLE' as any, progress: 0
      };
    }));

    setFiles(prev => [...newFiles, ...prev]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startUpload = async () => {
    setIsUploading(true);
    const pending = files.filter(x => x.status === 'IDLE');
    for (let i = 0; i < pending.length; i++) {
      const f = pending[i];
      try {
        const res = await uploadToTelegram(f.file, p => {
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'UPLOADING', progress: p } : x));
          setOverallProgress(((i / pending.length) * 100) + (p / pending.length));
        }) as Api.Message;
        
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'COMPLETED', progress: 100 } : x));
        const doc = (res.media as any).document;
        onUploadSuccess({
          messageId: res.id, name: f.name, size: f.size, date: res.date,
          mimeType: f.type, isVideo: f.type.startsWith('video'), downloadStatus: 'IDLE', downloadProgress: 0
        });
      } catch {
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'FAILED' } : x));
      }
    }
    setIsUploading(false);
    setOverallProgress(0);
  };

  return (
    <div>
      <StorageMetrics accountStats={accountStats} />
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Upload Hub</h2>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <label className="card" style={{ flex: 1, padding: '14px', textAlign: 'center', cursor: 'pointer', fontWeight: '800', fontSize: '12px' }}>
            SELECT <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          <button onClick={startUpload} disabled={isUploading || !files.some(f => f.status === 'IDLE')}
            style={{ flex: 2, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800' }}>
            {isUploading ? 'STREAMING...' : `START UPLOAD (${files.filter(f=>f.status==='IDLE').length})`}
          </button>
        </div>
        {isUploading && <div style={{ height: '6px', background: 'var(--accent)', borderRadius: '10px', marginTop: '15px', overflow: 'hidden' }}>
          <div style={{ width: `${overallProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }} />
        </div>}
      </div>

      <div className="gallery-grid">
        {files.map(f => (
          <div key={f.id} className="card" style={{ padding: '6px', position: 'relative' }}>
            {f.status === 'IDLE' && <button className="remove-btn" onClick={() => removeFile(f.id)}>✕</button>}
            <div style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden' }}>
              <img src={f.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {f.status === 'UPLOADING' && <div style={{ height: '3px', background: 'var(--primary)', width: `${f.progress}%`, marginTop: '4px' }} />}
            {f.status === 'COMPLETED' && <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--success)', borderRadius: '50%', padding: '3px' }}><IconCheck size={10} color="white" /></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocalGallery;