import React, { useState, useEffect } from 'react';
import { CloudFile } from '../types';
import { deleteFileFromTelegram, downloadFileFromTelegram } from '../services/cloud';
import CloudItem from './CloudItem';
import MediaViewer from './MediaViewer';
import { IconRefresh } from './Icons';

interface Props {
  initialFiles: CloudFile[];
  onRefresh: () => void;
  onLoadMore: () => void;
  loadingMore: boolean;
}

const CloudGallery: React.FC<Props> = ({ initialFiles, onRefresh, onLoadMore, loadingMore }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const groups: Record<string, CloudFile[]> = {};
  initialFiles.forEach(f => {
    const date = new Date(f.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  });

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Cloud Stream</h2>
        <button onClick={onRefresh} className="glass-card" style={{ padding: '10px 16px', fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: '#fff' }}>
          <IconRefresh size={14} /> SYNC NODES
        </button>
      </div>

      {Object.keys(groups).map(date => (
        <div key={date} style={{ marginBottom: '32px' }}>
          <div style={{ position: 'sticky', top: '70px', zIndex: 10, padding: '10px 16px', borderRadius: '14px', marginBottom: '16px', fontSize: '10px', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-muted)' }} className="glass-card">
            {date.toUpperCase()}
          </div>
          <div className="gallery-grid">
            {groups[date].map((f) => (
              <CloudItem key={f.messageId} file={f} onClick={() => setSelectedIndex(initialFiles.indexOf(f))} />
            ))}
          </div>
        </div>
      ))}

      {/* RE-IMPLEMENTED VISIBLE BUTTON */}
      <div style={{ textAlign: 'center', padding: '60px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={(e) => { e.preventDefault(); onLoadMore(); }} 
          disabled={loadingMore}
          style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            padding: '16px 48px', 
            borderRadius: '100px', 
            fontWeight: '800', 
            fontSize: '13px', 
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)',
            opacity: loadingMore ? 0.6 : 1
          }}
        >
          {loadingMore ? 'PULLING NODES...' : 'LOAD MORE MEDIA'}
        </button>
      </div>

      {selectedIndex !== null && (
        <MediaViewer 
          files={initialFiles} currentIndex={selectedIndex} 
          onClose={() => setSelectedIndex(null)} onIndexChange={setSelectedIndex}
          onDelete={async (id: number) => { await deleteFileFromTelegram(id); onRefresh(); setSelectedIndex(null); }}
          onDownload={async (f: any) => {
            const buf = await downloadFileFromTelegram(f.messageId, () => {});
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: f.mimeType })); a.download = f.name; a.click();
          }}
        />
      )}
    </div>
  );
};

export default CloudGallery;