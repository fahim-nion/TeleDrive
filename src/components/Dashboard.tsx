import React, { useState, useEffect } from 'react';
import LocalGallery from './LocalGallery';
import CloudGallery from './CloudGallery';
import DevCard from './DevCard';
import { fetchCloudFiles, getTotalStorageStats } from '../services/cloud';
import { CloudFile } from '../types';

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<'local' | 'cloud' | 'dev'>('local');
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [accountStats, setAccountStats] = useState({ total: 0, photos: 0, videos: 0 });

  const refreshCloud = async () => {
    try {
      const data = await fetchCloudFiles(0);
      setCloudFiles(data);
      setIsInitialLoading(false); // UI loads immediately with files
      
      // Calculate stats in background so it doesn't block the UI
      const stats = await getTotalStorageStats();
      setAccountStats(stats);
    } catch (e) {
      setIsInitialLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || cloudFiles.length === 0) return;
    setLoadingMore(true);
    const oldestMessageId = cloudFiles[cloudFiles.length - 1].messageId;
    const olderData = await fetchCloudFiles(oldestMessageId);
    if (olderData.length > 0) {
      setCloudFiles(prev => [...prev, ...olderData]);
    }
    setLoadingMore(false);
  };

  const addUploadedFile = (newFile: CloudFile) => {
    setCloudFiles(prev => [newFile, ...prev]);
    setAccountStats(prev => ({
      total: prev.total + newFile.size,
      photos: prev.photos + (!newFile.isVideo ? newFile.size : 0),
      videos: prev.videos + (newFile.isVideo ? newFile.size : 0)
    }));
  };

  useEffect(() => { refreshCloud(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '32px', background: 'var(--accent)', padding: '6px', borderRadius: '16px', width: '100%', overflow: 'hidden' }}>
        <div className="tabs-scroll-container">
          {[{id:'local',l:'MY GALLERY'},{id:'cloud',l:'UPLOADED'},{id:'dev',l:'DEVELOPER'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} 
              style={{ flex: '1 0 auto', padding: '10px 24px', background: tab === t.id ? 'var(--surface)' : 'transparent', border: 'none', borderRadius: '12px', color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {isInitialLoading ? (
        <div style={{ textAlign: 'center', padding: '100px', fontWeight: 800, fontSize: '12px', opacity: 0.5 }}>SYNCING CLOUD NODES...</div>
      ) : (
        <>
          {tab === 'local' && <LocalGallery cloudFiles={cloudFiles} accountStats={accountStats} onUploadSuccess={addUploadedFile} />}
          {tab === 'cloud' && (
            <CloudGallery 
              initialFiles={cloudFiles} 
              onRefresh={refreshCloud} 
              onLoadMore={handleLoadMore} 
              loadingMore={loadingMore} 
            />
          )}
          {tab === 'dev' && <DevCard />}
        </>
      )}
    </div>
  );
};

export default Dashboard;