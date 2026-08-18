import React, { useState, useEffect } from 'react';
import { CloudFile } from '../types';
import { fetchCloudFiles, downloadFileFromTelegram, deleteFileFromTelegram } from '../services/cloud';
import CloudItem from './CloudItem';
import MediaViewer from './MediaViewer';
import { IconRefresh } from './Icons';

interface Props {
  initialFiles: CloudFile[];
  onRefresh: () => void;
}

const CloudGallery: React.FC<Props> = ({ initialFiles, onRefresh }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [allFiles, setAllFiles] = useState<CloudFile[]>(initialFiles);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setAllFiles(initialFiles);
    setHasMore(true);
  }, [initialFiles]);

  const loadMore = async () => {
    if (loadingMore || allFiles.length === 0) return;
    setLoadingMore(true);

    // Get the ID of the oldest message in our current list
    const lastId = allFiles[allFiles.length - 1].messageId;
    
    try {
      const olderFiles = await fetchCloudFiles(lastId);
      if (olderFiles.length === 0) {
        setHasMore(false);
      } else {
        setAllFiles(prev => [...prev, ...olderFiles]);
      }
    } catch (e) {
      console.error("Failed to load more:", e);
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Cloud Stream</h2>
        <button onClick={onRefresh} className="glass-card" style={{ padding: '8px 16px', fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: 'inherit' }}>
          <IconRefresh size={14} /> SYNC
        </button>
      </div>

      {Object.keys(groups).map(date => (
        <div key={date} style={{ marginBottom: '32px' }}>
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

      {hasMore && (
        <div style={{ textAlign: 'center', padding: '40px 0 120px 0' }}>
          <button 
            onClick={loadMore} 
            disabled={loadingMore}
            className="glass-card"
            style={{ padding: '12px 40px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', color: 'inherit' }}
          >
            {loadingMore ? 'PULLING OLDER DATA...' : 'LOAD MORE MEDIA'}
          </button>
        </div>
      )}

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