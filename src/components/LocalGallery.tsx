import React, { useState } from 'react';
import { LocalFile, CloudFile } from '../types';
import { uploadToTelegram } from '../services/upload';
import StorageMetrics from './StorageMetrics';
import { IconSparkles, IconRefresh, IconCheck } from './Icons';
import { Api } from 'telegram';

interface Props {
  cloudFiles: CloudFile[];
  onUploadSuccess: (file: CloudFile) => void;
}

const LocalGallery: React.FC<Props> = ({ cloudFiles, onUploadSuccess }) => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: LocalFile[] = Array.from(e.target.files).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f, previewUrl: URL.createObjectURL(f),
      name: f.name, size: f.size, type: f.type,
      status: 'IDLE', progress: 0
    }));
    setFiles(prev => [...newFiles, ...prev]);
  };

  const startUpload = async () => {
    setIsUploading(true);
    const pending = files.filter(x => x.status === 'IDLE');
    const totalItems = pending.length;
    let completedCount = 0;

    for (const f of pending) {
      try {
        const result = await uploadToTelegram(f.file, p => {
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'UPLOADING', progress: p } : x));
          setOverallProgress(((completedCount / totalItems) * 100) + (p / totalItems));
        }) as Api.Message;

        const doc = (result.media as Api.MessageMediaDocument).document as Api.Document;
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'COMPLETED', progress: 100 } : x));
        completedCount++;
        onUploadSuccess({
          messageId: result.id, name: f.name, size: f.size,
          date: Math.floor(Date.now() / 1000), mimeType: f.type,
          downloadStatus: 'IDLE', downloadProgress: 0, isVideo: f.type.startsWith('video'),
          thumbnail: doc.thumbs && doc.thumbs.length > 0 ? result : undefined
        });
      } catch {
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'FAILED' } : x));
      }
    }
    setIsUploading(false);
    setOverallProgress(0);
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      <StorageMetrics files={cloudFiles} />

      <div className="glass-card" style={{ padding: '32px', marginBottom: '40px', borderRadius: '28px' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 800 }}>Upload Media</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px 0' }}>Stream original data to encrypted Telegram nodes.</p>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <label className="card" style={{ flex: 1, minWidth: '120px', padding: '14px', textAlign: 'center', cursor: 'pointer', fontWeight: '800', fontSize: '12px', background: 'var(--surface)', borderRadius: '14px' }}>
            SELECT
            <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          <button onClick={startUpload} disabled={isUploading || !files.some(f => f.status === 'IDLE')}
            style={{ flex: 2, minWidth: '180px', background: 'var(--primary)', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: '800', fontSize: '12px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {isUploading ? <IconRefresh className="spin" size={16} /> : <IconSparkles size={16} />}
            UPLOAD {files.filter(f => f.status === 'IDLE').length || ''}
          </button>
        </div>

        {isUploading && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ height: '6px', background: 'var(--accent)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${overallProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      <div className="gallery-grid">
        {files.map(f => (
          <div key={f.id} className="card" style={{ padding: '6px', position: 'relative', borderRadius: '20px' }}>
            <div style={{ aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg)' }}>
              <img src={f.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: f.status === 'UPLOADING' ? 0.4 : 1 }} />
            </div>
            {f.status === 'UPLOADING' && <div style={{ height: '3px', background: 'var(--primary)', width: `${f.progress}%`, marginTop: '6px' }} />}
            {f.status === 'COMPLETED' && <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--success)', color: 'white', padding: '4px', borderRadius: '50%', display: 'flex' }}><IconCheck size={10} /></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocalGallery;