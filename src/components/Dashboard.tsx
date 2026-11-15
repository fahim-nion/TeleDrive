import React, { useState, useEffect, useCallback } from 'react';
import LocalGallery from './LocalGallery';
import CloudGallery from './CloudGallery';
import DevCard from './DevCard';
import { fetchCloudFiles, getTotalStorageStats } from '../services/cloud';
import { cacheService } from '../services/cache';
import { CloudFile, FileCategory, StorageMetricsData } from '../types';
import { IconCloud, IconUploadCloud, IconUser, IconRefresh } from './Icons';

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<'local' | 'cloud' | 'dev'>('local');
  const [cloudCategoryFilter, setCloudCategoryFilter] = useState<FileCategory>('all');
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initialize storage metrics from synchronous cache for zero-delay first paint
  const [metrics, setMetrics] = useState<StorageMetricsData>(() => cacheService.getInitialStatsSync());

  const refreshCloud = useCallback(async (forceRescan: boolean = false) => {
    try {
      // 1. Fetch newest cloud files
      const data = await fetchCloudFiles(0, 60);
      setCloudFiles(data);
      setIsInitialLoading(false);

      // 2. Fetch or calculate full storage metrics
      const stats = await getTotalStorageStats(forceRescan);
      setMetrics(stats);
    } catch (e) {
      console.error("Cloud sync failed:", e);
      setIsInitialLoading(false);
    }
  }, []);

  const handleLoadMore = async () => {
    if (loadingMore || cloudFiles.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestMessageId = cloudFiles[cloudFiles.length - 1].messageId;
      const olderData = await fetchCloudFiles(oldestMessageId, 60);
      if (olderData.length > 0) {
        setCloudFiles(prev => [...prev, ...olderData]);
      }
    } catch (e) {
      console.error("Load more failed:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Optimistic real-time update on upload
  const addUploadedFile = (newFile: CloudFile) => {
    setCloudFiles(prev => [newFile, ...prev]);

    setMetrics(prev => {
      const isPhoto = newFile.category === 'image';
      const isVideo = newFile.category === 'video';
      const isDoc = newFile.category === 'document';
      const isAudio = newFile.category === 'audio';
      const isOther = !isPhoto && !isVideo && !isDoc && !isAudio;

      const updated: StorageMetricsData = {
        ...prev,
        totalBytes: prev.totalBytes + newFile.size,
        totalCount: prev.totalCount + 1,
        photoBytes: prev.photoBytes + (isPhoto ? newFile.size : 0),
        photoCount: prev.photoCount + (isPhoto ? 1 : 0),
        videoBytes: prev.videoBytes + (isVideo ? newFile.size : 0),
        videoCount: prev.videoCount + (isVideo ? 1 : 0),
        docBytes: prev.docBytes + (isDoc ? newFile.size : 0),
        docCount: prev.docCount + (isDoc ? 1 : 0),
        audioBytes: prev.audioBytes + (isAudio ? newFile.size : 0),
        audioCount: prev.audioCount + (isAudio ? 1 : 0),
        otherBytes: prev.otherBytes + (isOther ? newFile.size : 0),
        otherCount: prev.otherCount + (isOther ? 1 : 0),
        lastUpdated: Date.now(),
      };

      cacheService.saveCachedStats(updated).catch(() => {});
      return updated;
    });
  };

  // Optimistic real-time update on single file deletion
  const handleFileDeleted = (messageId: number, size: number, category: FileCategory) => {
    setCloudFiles(prev => prev.filter(f => f.messageId !== messageId));

    setMetrics(prev => {
      const isPhoto = category === 'image';
      const isVideo = category === 'video';
      const isDoc = category === 'document';
      const isAudio = category === 'audio';
      const isOther = !isPhoto && !isVideo && !isDoc && !isAudio;

      const updated: StorageMetricsData = {
        ...prev,
        totalBytes: Math.max(0, prev.totalBytes - size),
        totalCount: Math.max(0, prev.totalCount - 1),
        photoBytes: Math.max(0, prev.photoBytes - (isPhoto ? size : 0)),
        photoCount: Math.max(0, prev.photoCount - (isPhoto ? 1 : 0)),
        videoBytes: Math.max(0, prev.videoBytes - (isVideo ? size : 0)),
        videoCount: Math.max(0, prev.videoCount - (isVideo ? 1 : 0)),
        docBytes: Math.max(0, prev.docBytes - (isDoc ? size : 0)),
        docCount: Math.max(0, prev.docCount - (isDoc ? 1 : 0)),
        audioBytes: Math.max(0, prev.audioBytes - (isAudio ? size : 0)),
        audioCount: Math.max(0, prev.audioCount - (isAudio ? 1 : 0)),
        otherBytes: Math.max(0, prev.otherBytes - (isOther ? size : 0)),
        otherCount: Math.max(0, prev.otherCount - (isOther ? 1 : 0)),
        lastUpdated: Date.now(),
      };

      cacheService.saveCachedStats(updated).catch(() => {});
      return updated;
    });
  };

  // Optimistic update on batch deletion
  const handleBatchFilesDeleted = (deletedFiles: { messageId: number; size: number; category: FileCategory }[]) => {
    const deletedIdSet = new Set(deletedFiles.map(d => d.messageId));
    setCloudFiles(prev => prev.filter(f => !deletedIdSet.has(f.messageId)));

    setMetrics(prev => {
      let subTotal = 0;
      let subPhoto = 0, subPhotoCount = 0;
      let subVideo = 0, subVideoCount = 0;
      let subDoc = 0, subDocCount = 0;
      let subAudio = 0, subAudioCount = 0;
      let subOther = 0, subOtherCount = 0;

      for (const d of deletedFiles) {
        subTotal += d.size;
        if (d.category === 'image') { subPhoto += d.size; subPhotoCount++; }
        else if (d.category === 'video') { subVideo += d.size; subVideoCount++; }
        else if (d.category === 'document') { subDoc += d.size; subDocCount++; }
        else if (d.category === 'audio') { subAudio += d.size; subAudioCount++; }
        else { subOther += d.size; subOtherCount++; }
      }

      const updated: StorageMetricsData = {
        ...prev,
        totalBytes: Math.max(0, prev.totalBytes - subTotal),
        totalCount: Math.max(0, prev.totalCount - deletedFiles.length),
        photoBytes: Math.max(0, prev.photoBytes - subPhoto),
        photoCount: Math.max(0, prev.photoCount - subPhotoCount),
        videoBytes: Math.max(0, prev.videoBytes - subVideo),
        videoCount: Math.max(0, prev.videoCount - subVideoCount),
        docBytes: Math.max(0, prev.docBytes - subDoc),
        docCount: Math.max(0, prev.docCount - subDocCount),
        audioBytes: Math.max(0, prev.audioBytes - subAudio),
        audioCount: Math.max(0, prev.audioCount - subAudioCount),
        otherBytes: Math.max(0, prev.otherBytes - subOther),
        otherCount: Math.max(0, prev.otherCount - subOtherCount),
        lastUpdated: Date.now(),
      };

      cacheService.saveCachedStats(updated).catch(() => {});
      return updated;
    });
  };

  // Jump from metrics card to Cloud stream filtered by category
  const handleSelectCategoryFromMetrics = (category: FileCategory) => {
    setCloudCategoryFilter(category);
    setTab('cloud');
  };

  useEffect(() => {
    // 1. Try loading cached files first for instant view
    cacheService.getCachedFiles().then(cached => {
      if (cached && cached.length > 0) {
        setCloudFiles(cached);
        setIsInitialLoading(false);
      }
    });

    // 2. Perform live network sync
    refreshCloud(false);
  }, [refreshCloud]);

  return (
    <div>
      {/* Tab Switcher Navigation */}
      <div style={{ 
        marginBottom: '32px', 
        background: 'var(--surface)', 
        border: '1px solid var(--border)',
        padding: '6px', 
        borderRadius: '18px', 
        width: '100%', 
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="tabs-scroll-container">
          {[
            { id: 'local', label: 'UPLOAD HUB', icon: <IconUploadCloud size={15} /> },
            { 
              id: 'cloud', 
              label: 'CLOUD STREAM', 
              icon: <IconCloud size={15} />,
              badge: metrics.totalCount > 0 ? metrics.totalCount : undefined 
            },
            { id: 'dev', label: 'DEVELOPER', icon: <IconUser size={15} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as any);
                if (t.id === 'cloud') setCloudCategoryFilter('all');
              }}
              style={{
                flex: '1 0 auto',
                padding: '12px 24px',
                background: tab === t.id ? 'var(--primary)' : 'transparent',
                border: 'none',
                borderRadius: '12px',
                color: tab === t.id ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: tab === t.id ? '0 4px 14px var(--primary-glow)' : 'none',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge !== undefined && (
                <span style={{
                  background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
                  color: tab === t.id ? '#FFFFFF' : 'var(--primary)',
                  fontSize: '9px',
                  fontWeight: 900,
                  padding: '1px 7px',
                  borderRadius: '100px',
                  marginLeft: '2px',
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isInitialLoading && cloudFiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', fontWeight: 800, fontSize: '13px', color: 'var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <IconRefresh size={32} className="spin" />
          <span>ESTABLISHING MTPROTO WEBSOCKET CONNECTION...</span>
        </div>
      ) : (
        <>
          {tab === 'local' && (
            <LocalGallery 
              cloudFiles={cloudFiles} 
              metrics={metrics}
              onRefreshMetrics={() => refreshCloud(true)}
              onSelectCategory={handleSelectCategoryFromMetrics}
              onUploadSuccess={addUploadedFile} 
            />
          )}

          {tab === 'cloud' && (
            <CloudGallery 
              initialFiles={cloudFiles} 
              initialCategoryFilter={cloudCategoryFilter}
              onRefresh={() => refreshCloud(true)} 
              onLoadMore={handleLoadMore} 
              loadingMore={loadingMore} 
              onFileDeleted={handleFileDeleted}
              onBatchFilesDeleted={handleBatchFilesDeleted}
            />
          )}

          {tab === 'dev' && <DevCard />}
        </>
      )}
    </div>
  );
};

export default Dashboard;
