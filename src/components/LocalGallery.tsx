import React, { useState, useRef, useEffect } from 'react';
import { LocalFile, CloudFile, StorageMetricsData, FileCategory } from '../types';
import { uploadToTelegram } from '../services/upload';
import StorageMetrics, { formatBytes } from './StorageMetrics';
import { 
  IconSparkles, 
  IconRefresh, 
  IconCheck, 
  IconUploadCloud, 
  IconImage, 
  IconVideo, 
  IconFileText, 
  IconMusic, 
  IconArchive, 
  IconTrash, 
  IconAlertTriangle 
} from './Icons';
import { categorizeFile } from '../services/cloud';
import { Api } from 'telegram';

interface Props {
  cloudFiles: CloudFile[];
  metrics: StorageMetricsData;
  onRefreshMetrics?: () => Promise<void>;
  onSelectCategory?: (category: FileCategory) => void;
  onUploadSuccess: (file: CloudFile) => void;
}

const LocalGallery: React.FC<Props> = ({ 
  metrics, 
  onRefreshMetrics, 
  onSelectCategory, 
  onUploadSuccess 
}) => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadedBytesRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: 0 });

  const processFileList = async (fileList: FileList | File[]) => {
    const selected = Array.from(fileList);
    const newItems: LocalFile[] = [];

    for (const f of selected) {
      let previewUrl = '';
      const category = categorizeFile(f.type, f.name);

      if (category === 'image') {
        if (f.name.toLowerCase().endsWith('.heic')) {
          try {
            // Dynamically load heic2any only when an iPhone HEIC photo is selected
            // @ts-ignore
            const heicModule = await import('heic2any');
            const heic2any = heicModule.default || heicModule;
            const converted = await heic2any({
              blob: f,
              toType: "image/jpeg",
              quality: 0.6
            });
            previewUrl = URL.createObjectURL(Array.isArray(converted) ? converted[0] : converted);
          } catch (err) {
            console.error("HEIC conversion failed:", err);
            previewUrl = '';
          }
        } else {
          previewUrl = URL.createObjectURL(f);
        }
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 11),
        file: f,
        previewUrl,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        category,
        status: 'IDLE',
        progress: 0
      });
    }

    setFiles(prev => [...newItems, ...prev]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await processFileList(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFileList(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearCompleted = () => {
    setFiles(prev => {
      prev.filter(f => f.status === 'COMPLETED').forEach(f => {
        if (f.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(f.previewUrl);
      });
      return prev.filter(f => f.status !== 'COMPLETED');
    });
  };

  const clearAll = () => {
    if (isUploading) return;
    files.forEach(f => {
      if (f.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
  };

  // Turbo Upload Execution
  const startUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const pending = files.filter(x => x.status === 'IDLE' || x.status === 'FAILED');
    const totalCount = pending.length;
    lastUploadedBytesRef.current = { bytes: 0, time: Date.now() };

    for (let i = 0; i < totalCount; i++) {
      const f = pending[i];
      setCurrentFileIndex(i + 1);

      try {
        const result = await uploadToTelegram(f.file, (p) => {
          setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'UPLOADING', progress: p } : x));
          setOverallProgress(Math.round(((i / totalCount) * 100) + (p / totalCount)));

          // Calculate upload speed
          const now = Date.now();
          const elapsed = (now - lastUploadedBytesRef.current.time) / 1000;
          if (elapsed > 1) {
            const currentBytesDone = (p / 100) * f.size;
            const diffBytes = currentBytesDone - lastUploadedBytesRef.current.bytes;
            if (diffBytes > 0) {
              const bytesPerSec = diffBytes / elapsed;
              const spd = formatBytes(bytesPerSec);
              setUploadSpeed(`${spd.val} ${spd.unit}/s`);
            }
            lastUploadedBytesRef.current = { bytes: currentBytesDone, time: now };
          }
        }) as Api.Message;

        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'COMPLETED', progress: 100 } : x));

        onUploadSuccess({
          messageId: result.id,
          name: f.name,
          size: f.size,
          date: Math.floor(Date.now() / 1000),
          mimeType: f.type,
          category: f.category,
          downloadStatus: 'IDLE',
          downloadProgress: 0,
          isVideo: f.category === 'video',
          isAudio: f.category === 'audio',
          isImage: f.category === 'image',
          duration: 0
        });
      } catch (err: any) {
        console.error("Upload error on file:", f.name, err);
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'FAILED', error: err.message } : x));
      }
    }

    setIsUploading(false);
    setOverallProgress(0);
    setUploadSpeed('');
  };

  const pendingCount = files.filter(f => f.status === 'IDLE' || f.status === 'FAILED').length;
  const completedCount = files.filter(f => f.status === 'COMPLETED').length;
  const totalBatchBytes = files.reduce((acc, curr) => acc + curr.size, 0);
  const formattedBatchSize = formatBytes(totalBatchBytes);

  return (
    <div style={{ paddingBottom: '120px' }}>
      {/* 1. Storage Metrics Engine */}
      <StorageMetrics 
        metrics={metrics} 
        onRefreshMetrics={onRefreshMetrics}
        onSelectCategory={onSelectCategory}
      />

      {/* 2. Upload Hub & Dropzone */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Upload Hub
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              Direct client-side MTProto upload to Telegram Saved Messages. No compression, original bytes preserved.
            </p>
          </div>

          {files.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  style={{
                    background: 'var(--accent)',
                    border: '1px solid var(--border)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  CLEAR COMPLETED ({completedCount})
                </button>
              )}
              <button
                onClick={clearAll}
                disabled={isUploading}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: 'var(--error)'
                }}
              >
                CLEAR ALL
              </button>
            </div>
          )}
        </div>

        {/* Drag & Drop Area */}
        <div 
          className={`upload-dropzone ${isDragOver ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginTop: '24px' }}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '18px', 
            background: 'var(--primary-light)', 
            color: 'var(--primary)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <IconUploadCloud size={28} />
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>
            Drag & drop files here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Supports photos, videos, documents, audio, zip archives (Up to 2GB per file)
          </div>
        </div>

        {/* Queue Control Buttons */}
        {files.length > 0 && (
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              <span>{files.length} {files.length === 1 ? 'file' : 'files'} in queue</span> • <span>{formattedBatchSize.val} {formattedBatchSize.unit} total</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  flex: '1 1 130px',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                + ADD MORE FILES
              </button>

              <button
                onClick={startUpload}
                disabled={isUploading || pendingCount === 0}
                style={{
                  flex: '1 1 160px',
                  padding: '12px 24px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: (isUploading || pendingCount === 0) ? 'not-allowed' : 'pointer',
                  opacity: (isUploading || pendingCount === 0) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px var(--primary-glow)'
                }}
              >
                {isUploading ? <IconRefresh size={16} className="spin" /> : <IconSparkles size={14} />}
                {isUploading ? 'STREAMING NODES...' : `UPLOAD ${pendingCount > 0 ? pendingCount : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Upload Telemetry Status */}
        {isUploading && (
          <div style={{ marginTop: '24px', padding: '16px 20px', background: 'var(--surface-secondary)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px', fontWeight: 800 }}>
              <span style={{ color: 'var(--primary)' }}>
                Uploading file {currentFileIndex} of {files.filter(f => f.status === 'UPLOADING' || f.status === 'COMPLETED').length}...
              </span>
              <span>
                {uploadSpeed && <span style={{ marginRight: '12px', color: 'var(--text-muted)' }}>{uploadSpeed}</span>}
                {overallProgress}%
              </span>
            </div>
            <div style={{ height: '8px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${overallProgress}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #6366F1, #818CF8)', 
                  transition: 'width 0.25s ease' 
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Selected Files Grid */}
      {files.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-secondary)' }}>
            QUEUE LIST ({files.length})
          </div>

          <div className="gallery-grid">
            {files.map(f => {
              const size = formatBytes(f.size);
              const isLarge = f.size > 2 * 1024 * 1024 * 1024; // > 2GB warning

              return (
                <div 
                  key={f.id} 
                  className="card" 
                  style={{ 
                    padding: '8px', 
                    position: 'relative', 
                    borderRadius: '16px',
                    borderColor: f.status === 'FAILED' ? 'var(--error)' : f.status === 'COMPLETED' ? 'var(--success)' : 'var(--border)'
                  }}
                >
                  {/* Remove Button for non-uploading */}
                  {f.status !== 'UPLOADING' && (
                    <button 
                      className="remove-x" 
                      onClick={() => removeFile(f.id)} 
                      title="Remove file"
                    >
                      ✕
                    </button>
                  )}

                  {/* Thumbnail / File Icon */}
                  <div style={{ 
                    aspectRatio: '1/1', 
                    borderRadius: '12px', 
                    overflow: 'hidden', 
                    background: 'var(--surface-secondary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    position: 'relative' 
                  }}>
                    {f.previewUrl ? (
                      <img 
                        src={f.previewUrl} 
                        alt={f.name}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          opacity: f.status === 'UPLOADING' ? 0.4 : 1 
                        }} 
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {f.category === 'video' ? <IconVideo size={28} color="var(--accent-video)" /> :
                         f.category === 'audio' ? <IconMusic size={28} color="var(--accent-audio)" /> :
                         f.category === 'document' ? <IconFileText size={28} color="var(--accent-doc)" /> :
                         f.category === 'archive' ? <IconArchive size={28} color="var(--accent-other)" /> :
                         <IconImage size={28} color="var(--primary)" />}
                        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)' }}>
                          {f.name.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    {f.status === 'COMPLETED' && (
                      <div style={{ 
                        position: 'absolute', 
                        bottom: '8px', 
                        right: '8px', 
                        background: 'var(--success)', 
                        color: 'white', 
                        padding: '4px', 
                        borderRadius: '50%', 
                        display: 'flex' 
                      }}>
                        <IconCheck size={12} />
                      </div>
                    )}

                    {f.status === 'UPLOADING' && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        <span style={{ color: 'white', fontWeight: 900, fontSize: '14px' }}>{f.progress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Line */}
                  {f.status === 'UPLOADING' && (
                    <div style={{ height: '3px', background: 'var(--primary)', width: `${f.progress}%`, marginTop: '6px', borderRadius: '4px' }} />
                  )}

                  {/* File Metadata */}
                  <div style={{ padding: '6px 2px 2px 2px' }}>
                    <div 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        color: 'var(--text)' 
                      }} 
                      title={f.name}
                    >
                      {f.name}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <span>{size.val} {size.unit}</span>
                      {f.status === 'FAILED' ? (
                        <span style={{ color: 'var(--error)' }}>FAILED</span>
                      ) : f.status === 'COMPLETED' ? (
                        <span style={{ color: 'var(--success)' }}>SYNCED</span>
                      ) : (
                        <span>READY</span>
                      )}
                    </div>

                    {isLarge && (
                      <div style={{ color: 'var(--warning)', fontSize: '8px', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <IconAlertTriangle size={10} /> &gt;2GB: Premium only
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalGallery;
