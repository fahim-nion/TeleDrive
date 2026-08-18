import React, { useState, useEffect } from 'react';
import LocalGallery from './LocalGallery';
import CloudGallery from './CloudGallery';
import DevCard from './DevCard';
import { fetchCloudFiles } from '../services/cloud';
import { CloudFile } from '../types';

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<'local' | 'cloud' | 'dev'>('local');
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const refreshCloud = async () => {
    const data = await fetchCloudFiles();
    setCloudFiles(data);
    setIsInitialLoading(false);
  };

  const addUploadedFile = (newFile: CloudFile) => {
    setCloudFiles(prev => [newFile, ...prev]);
  };

  useEffect(() => { refreshCloud(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '32px', background: 'var(--accent)', padding: '6px', borderRadius: '16px', width: '100%', overflow: 'hidden' }}>
        <div className="tabs-scroll-container">
          {[
            { id: 'local', label: 'MY GALLERY' },
            { id: 'cloud', label: 'UPLOADED' },
            { id: 'dev', label: 'DEVELOPER' }
          ].map((t) => (
            <button 
              key={t.id}
              onClick={() => setTab(t.id as any)} 
              style={{ 
                flex: '1 0 auto',
                padding: '10px 20px', 
                background: tab === t.id ? 'var(--surface)' : 'transparent', 
                border: 'none', borderRadius: '12px', 
                color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)', 
                fontWeight: '800', fontSize: '11px', cursor: 'pointer',
                boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                whiteSpace: 'nowrap'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isInitialLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5, fontWeight: 800, fontSize: '12px' }}>SYNCING CLOUD...</div>
      ) : (
        <>
          {tab === 'local' && <LocalGallery cloudFiles={cloudFiles} onUploadSuccess={addUploadedFile} />}
          {tab === 'cloud' && <CloudGallery initialFiles={cloudFiles} onRefresh={refreshCloud} />}
          {tab === 'dev' && <DevCard />}
        </>
      )}
    </div>
  );
};

export default Dashboard;