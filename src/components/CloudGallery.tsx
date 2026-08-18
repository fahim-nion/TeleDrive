import React, { useState } from 'react';
import { CloudFile } from '../types';
import { deleteFileFromTelegram, downloadFileFromTelegram } from '../services/cloud';
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

  const handleSyncClick = async () => {
    setSyncing(true);
    try {
      await onRefresh();
    } finally {
      setSyncing(false);
    }
  };

  const groups: Record<string, CloudFile[]> = {};
  initialFiles.forEach(f => {
    const date = new Date(f.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  });

  const handleDelete = async (id: number) => {
    if(!confirm('Delete this file?')) return;
    await deleteFileFromTelegram(id);
    onRefresh();
    setSelectedIndex(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Cloud Stream</h2>
        <button 
          onClick={handleSyncClick}
          disabled={syncing}
          className="glass-card" 
          style={{ padding: '10px 16px', fontWeight: '800', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', cursor: 'pointer', opacity: syncing ? 0.5 : 1, color: 'inherit' }}
        >
          <IconRefresh size={14} className={syncing ? 'spin' : ''} /> 
          {syncing ? 'SYNCING...' : 'SYNC NODES'}
        </button>
      </div>

      {Object.keys(groups).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}>No cloud data detected.</div>
      ) : (
        Object.keys(groups).map(date => (
          <div key={date} style={{ marginBottom: '32px' }}>
            <div style={{ position: 'sticky', top: '70px', zIndex: 10, padding: '10px 16px', borderRadius: '14px', marginBottom: '16px', fontSize: '10px', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-muted)' }} className="glass-card">
              {date.toUpperCase()}
            </div>
            <div className="gallery-grid">
              {groups[date].map((f) => (
                <CloudItem 
                  key={f.messageId} 
                  file={f} 
                  onClick={() => setSelectedIndex(initialFiles.indexOf(f))} 
                />
              ))}
            </div>
          </div>
        ))
      )}

      {selectedIndex !== null && (
        <MediaViewer 
          files={initialFiles} currentIndex={selectedIndex} 
          onClose={() => setSelectedIndex(null)} onIndexChange={setSelectedIndex}
          onDelete={handleDelete} onDownload={async (file: CloudFile) => {
            const buffer = await downloadFileFromTelegram(file.messageId, () => {});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([buffer], { type: file.mimeType }));
            a.download = file.name;
            a.click();
          }}
        />
      )}
    </div>
  );
};

export default CloudGallery;