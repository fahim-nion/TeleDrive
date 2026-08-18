import React, { useState, useEffect } from 'react';
import { CloudFile } from '../types';
import { deleteFileFromTelegram, downloadFileFromTelegram, fetchCloudFiles } from '../services/cloud';
import CloudItem from './CloudItem';
import MediaViewer from './MediaViewer';
import { IconRefresh } from './Icons';

interface Props {
  initialFiles: CloudFile[];
  onRefresh: () => void;
}

const CloudGallery: React.FC<Props> = ({ initialFiles, onRefresh }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allFiles, setAllFiles] = useState<CloudFile[]>(initialFiles);

  useEffect(() => { setAllFiles(initialFiles); }, [initialFiles]);

  const handleLoadMore = async () => {
    if (allFiles.length === 0 || loadingMore) return;
    setLoadingMore(true);
    try {
      const lastId = allFiles[allFiles.length - 1].messageId;
      const olderFiles = await fetchCloudFiles(lastId);
      if (olderFiles.length > 0) {
        setAllFiles(prev => [...prev, ...olderFiles]);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const groups: Record<string, CloudFile[]> = {};
  allFiles.forEach(f => {
    const date = new Date(f.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Cloud Stream</h2>
        <button onClick={() => { setSyncing(true); onRefresh(); setTimeout(() => setSyncing(false), 2000); }} 
          disabled={syncing} className="glass-card" 
          style={{ padding: '10px 16px', fontWeight: '800', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: 'inherit' }}>
          <IconRefresh size={14} className={syncing ? 'spin' : ''} /> SYNC NODES
        </button>
      </div>

      {Object.keys(groups).map(date => (
        <div key={date} style={{ 
          marginBottom: '32px',
          /* PERFORMANCE FIX: Virtualization hint for browser */
          contentVisibility: 'auto', 
          containIntrinsicSize: '0 500px' 
        }}>
          <div style={{ position: 'sticky', top: '70px', zIndex: 10, padding: '10px 16px', borderRadius: '14px', marginBottom: '16px', fontSize: '10px', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-muted)' }} className="glass-card">
            {date.toUpperCase()}
          </div>
          <div className="gallery-grid">
            {groups[date].map((f) => (
              <CloudItem key={f.messageId} file={f} onClick={() => setSelectedIndex(allFiles.indexOf(f))} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', padding: '40px 0 100px 0' }}>
        <button onClick={handleLoadMore} disabled={loadingMore}
          className="glass-card" style={{ padding: '14px 40px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', color: 'inherit' }}>
          {loadingMore ? 'PULLING OLDER NODES...' : 'LOAD MORE MEDIA'}
        </button>
      </div>

      {selectedIndex !== null && (
        <MediaViewer 
          files={allFiles} currentIndex={selectedIndex} 
          onClose={() => setSelectedIndex(null)} onIndexChange={setSelectedIndex}
          onDelete={async (id: number) => { await deleteFileFromTelegram(id); onRefresh(); setSelectedIndex(null); }}
          onDownload={async (file: CloudFile) => {
            const buf = await downloadFileFromTelegram(file.messageId, () => {});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([buf], { type: file.mimeType }));
            a.download = file.name;
            a.click();
          }}
        />
      )}
    </div>
  );
};

export default CloudGallery;