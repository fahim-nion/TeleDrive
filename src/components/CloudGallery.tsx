import React, { useState, useMemo } from 'react';
import { CloudFile, FileCategory } from '../types';
import { 
  deleteFileFromTelegram, 
  deleteMultipleFilesFromTelegram, 
  downloadFileFromTelegram
} from '../services/cloud';
import CloudItem from './CloudItem';
import MediaViewer from './MediaViewer';
import { 
  IconRefresh, 
  IconSearch, 
  IconGrid, 
  IconList, 
  IconDownload, 
  IconTrash, 
  IconCheck, 
  IconX,
  IconSparkles,
  IconVideo,
  IconImage,
  IconMusic,
  IconFileText,
  IconArchive,
  IconCheckCircle
} from './Icons';
import { formatBytes } from './StorageMetrics';
import JSZip from 'jszip';

interface Props {
  initialFiles: CloudFile[];
  initialCategoryFilter?: FileCategory;
  onRefresh: () => Promise<void>;
  onLoadMore: () => void;
  loadingMore: boolean;
  onFileDeleted?: (messageId: number, size: number, category: FileCategory) => void;
  onBatchFilesDeleted?: (deleted: { messageId: number; size: number; category: FileCategory }[]) => void;
}

type SortOption = 'newest' | 'oldest' | 'largest' | 'smallest' | 'name';

interface DownloadProgressModalState {
  open: boolean;
  totalFiles: number;
  currentIndex: number;
  currentFileName: string;
  status: 'downloading' | 'zipping' | 'completed' | 'error';
  percent: number;
}

const CloudGallery: React.FC<Props> = ({ 
  initialFiles, 
  initialCategoryFilter = 'all',
  onRefresh, 
  onLoadMore, 
  loadingMore,
  onFileDeleted,
  onBatchFilesDeleted
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FileCategory>(initialCategoryFilter);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    filesToDelete: CloudFile[];
  }>({ open: false, filesToDelete: [] });

  // Batch download progress modal state
  const [downloadModal, setDownloadModal] = useState<DownloadProgressModalState>({
    open: false,
    totalFiles: 0,
    currentIndex: 0,
    currentFileName: '',
    status: 'downloading',
    percent: 0,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
      showToast('Cloud stream refreshed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter & Search & Sort logic
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...initialFiles];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    // 2. Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter(f => f.category === categoryFilter);
    }

    // 3. Sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b.date - a.date);
        break;
      case 'oldest':
        result.sort((a, b) => a.date - b.date);
        break;
      case 'largest':
        result.sort((a, b) => b.size - a.size);
        break;
      case 'smallest':
        result.sort((a, b) => a.size - b.size);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [initialFiles, searchQuery, categoryFilter, sortBy]);

  // Date Grouping for Grid View
  const groups = useMemo(() => {
    const acc: Record<string, CloudFile[]> = {};
    filteredAndSortedFiles.forEach(f => {
      const date = new Date(f.date * 1000).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(f);
    });
    return acc;
  }, [filteredAndSortedFiles]);

  // Selection handlers
  const toggleSelectId = (id: number) => {
    if (!isSelectMode) setIsSelectMode(true);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredAndSortedFiles.map(f => f.messageId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Quick helper to enter photo selection mode directly
  const enterPhotoSelectMode = () => {
    setCategoryFilter('image');
    setIsSelectMode(true);
    showToast('Photo selection mode active. Tap photos to select.');
  };

  // Selected files metrics
  const selectedFiles = useMemo(() => {
    return initialFiles.filter(f => selectedIds.has(f.messageId));
  }, [initialFiles, selectedIds]);

  const totalSelectedBytes = useMemo(() => {
    return selectedFiles.reduce((acc, curr) => acc + curr.size, 0);
  }, [selectedFiles]);

  const formattedSelectedSize = formatBytes(totalSelectedBytes);

  // Single file download
  const handleDownloadSingle = async (file: CloudFile) => {
    showToast(`Downloading "${file.name}"...`);
    try {
      const buf = await downloadFileFromTelegram(file.messageId, () => {});
      const blob = new Blob([buf], { type: file.mimeType });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      showToast(`Downloaded "${file.name}"`);
    } catch (e) {
      showToast(`Failed to download ${file.name}`);
    }
  };

  // BATCH DOWNLOAD WITH ZIP (Robust for Mobile & Desktop)
  const handleBatchDownloadSelected = async () => {
    const toDownload = selectedFiles;
    if (toDownload.length === 0) return;

    // If only 1 file is selected, download directly
    if (toDownload.length === 1) {
      await handleDownloadSingle(toDownload[0]);
      setIsSelectMode(false);
      setSelectedIds(new Set());
      return;
    }

    // Multiple files: Zip bundle with progress modal
    setDownloadModal({
      open: true,
      totalFiles: toDownload.length,
      currentIndex: 1,
      currentFileName: toDownload[0].name,
      status: 'downloading',
      percent: 0,
    });

    try {
      const zip = new JSZip();

      for (let i = 0; i < toDownload.length; i++) {
        const file = toDownload[i];
        setDownloadModal(prev => ({
          ...prev,
          currentIndex: i + 1,
          currentFileName: file.name,
          percent: Math.round((i / toDownload.length) * 100),
        }));

        const buffer = await downloadFileFromTelegram(file.messageId, () => {});
        
        // Ensure unique filename inside zip
        let zipFileName = file.name;
        if (zip.file(zipFileName)) {
          zipFileName = `${file.messageId}_${file.name}`;
        }
        zip.file(zipFileName, buffer);
      }

      setDownloadModal(prev => ({
        ...prev,
        status: 'zipping',
        percent: 95,
      }));

      // Generate Zip
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setDownloadModal(prev => ({
          ...prev,
          percent: Math.round(metadata.percent),
        }));
      });

      // Trigger download of zip
      const a = document.createElement('a');
      const isAllPhotos = toDownload.every(f => f.category === 'image');
      const zipName = isAllPhotos 
        ? `TeleDrive_Photos_${toDownload.length}_items.zip` 
        : `TeleDrive_Files_${toDownload.length}_items.zip`;

      a.href = URL.createObjectURL(zipBlob);
      a.download = zipName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 15000);

      setDownloadModal(prev => ({
        ...prev,
        status: 'completed',
        percent: 100,
      }));

      setTimeout(() => {
        setDownloadModal({
          open: false,
          totalFiles: 0,
          currentIndex: 0,
          currentFileName: '',
          status: 'downloading',
          percent: 0,
        });
        showToast(`Saved ${toDownload.length} files as ZIP`);
        setIsSelectMode(false);
        setSelectedIds(new Set());
      }, 1000);

    } catch (err: any) {
      console.error("Batch download error:", err);
      setDownloadModal(prev => ({
        ...prev,
        status: 'error',
      }));
      showToast("Download failed. Please check network connection.");
    }
  };

  // Delete Action Confirm
  const executeDelete = async () => {
    const files = deleteModalState.filesToDelete;
    setDeleteModalState({ open: false, filesToDelete: [] });

    if (files.length === 1) {
      const file = files[0];
      try {
        await deleteFileFromTelegram(file.messageId);
        onFileDeleted?.(file.messageId, file.size, file.category);
        showToast(`Deleted "${file.name}"`);
      } catch (e) {
        showToast('Failed to delete file');
      }
    } else if (files.length > 1) {
      try {
        const ids = files.map(f => f.messageId);
        await deleteMultipleFilesFromTelegram(ids);
        onBatchFilesDeleted?.(files.map(f => ({ messageId: f.messageId, size: f.size, category: f.category })));
        showToast(`Deleted ${files.length} files`);
        setIsSelectMode(false);
        setSelectedIds(new Set());
      } catch (e) {
        showToast('Failed to delete files');
      }
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: initialFiles.length, image: 0, video: 0, document: 0, audio: 0, archive: 0 };
    initialFiles.forEach(f => {
      if (f.category in counts) {
        counts[f.category as keyof typeof counts]++;
      }
    });
    return counts;
  }, [initialFiles]);

  return (
    <div style={{ paddingBottom: '140px' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className="animate-toast" 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            left: '50%', 
            zIndex: 10002, 
            background: 'var(--surface)', 
            color: 'var(--text)', 
            padding: '10px 24px', 
            borderRadius: '100px', 
            fontWeight: 800, 
            fontSize: '11px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            maxWidth: '90vw',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Batch Download Progress Modal */}
      {downloadModal.open && (
        <div className="modal-overlay" style={{ zIndex: 10005 }}>
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', padding: '28px 24px' }}>
            <div style={{ 
              width: '54px', 
              height: '54px', 
              borderRadius: '16px', 
              background: 'var(--primary-light)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              {downloadModal.status === 'completed' ? (
                <IconCheckCircle size={28} color="var(--success)" />
              ) : (
                <IconDownload size={26} className={downloadModal.status !== 'error' ? 'pulse' : ''} />
              )}
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800 }}>
              {downloadModal.status === 'completed' ? 'Download Complete!' :
               downloadModal.status === 'zipping' ? 'Creating ZIP Package...' :
               downloadModal.status === 'error' ? 'Download Interrupted' :
               `Downloading (${downloadModal.currentIndex}/${downloadModal.totalFiles})`}
            </h3>

            <p style={{ 
              fontSize: '12px', 
              color: 'var(--text-muted)', 
              marginBottom: '20px', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {downloadModal.currentFileName}
            </p>

            <div style={{ height: '8px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: '14px' }}>
              <div 
                style={{ 
                  width: `${downloadModal.percent}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #6366F1, #A855F7)',
                  transition: 'width 0.25s ease' 
                }} 
              />
            </div>

            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px' }}>
              {downloadModal.percent}% complete
            </div>

            {downloadModal.status === 'error' && (
              <button 
                onClick={() => setDownloadModal(prev => ({ ...prev, open: false }))}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--error)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                CLOSE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalState.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '360px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '50%', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--error)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 14px auto'
              }}>
                <IconTrash size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800 }}>
                Delete from Telegram?
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {deleteModalState.filesToDelete.length === 1 
                  ? `Permanently delete "${deleteModalState.filesToDelete[0].name}" from your Telegram Saved Messages?` 
                  : `Permanently delete ${deleteModalState.filesToDelete.length} selected items from Telegram?`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setDeleteModalState({ open: false, filesToDelete: [] })} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border)', 
                  background: 'transparent', 
                  color: 'var(--text)', 
                  fontWeight: 800, 
                  fontSize: '12px',
                  cursor: 'pointer' 
                }}
              >
                CANCEL
              </button>
              <button 
                onClick={executeDelete} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: '#EF4444', 
                  color: 'white', 
                  fontWeight: 800, 
                  fontSize: '12px',
                  cursor: 'pointer' 
                }}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        
        {/* Row 1: Header + Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Cloud Stream
              </h2>
              <span className="badge badge-primary">
                {filteredAndSortedFiles.length}
              </span>
            </div>
          </div>

          {/* Quick action buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* Direct Select Photos shortcut */}
            {!isSelectMode && categoryCounts.image > 0 && (
              <button
                onClick={enterPhotoSelectMode}
                className="glass-card"
                style={{
                  padding: '7px 12px',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: '1px solid var(--primary-light)',
                  background: 'var(--primary-light)',
                }}
                title="Select photos to download"
              >
                <IconImage size={13} />
                <span>SELECT PHOTOS</span>
              </button>
            )}

            {/* Select Toggle Button */}
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedIds(new Set());
              }}
              className="glass-card"
              style={{
                padding: '7px 12px',
                fontWeight: 800,
                fontSize: '11px',
                cursor: 'pointer',
                color: isSelectMode ? 'white' : 'var(--text)',
                background: isSelectMode ? 'var(--primary)' : 'var(--surface)',
                borderColor: isSelectMode ? 'var(--primary)' : 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <IconCheck size={13} />
              <span>{isSelectMode ? 'CANCEL' : 'SELECT'}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="glass-card" style={{ display: 'flex', padding: '2px', borderRadius: '10px' }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                style={{
                  padding: '5px 8px',
                  borderRadius: '7px',
                  border: 'none',
                  background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <IconGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                style={{
                  padding: '5px 8px',
                  borderRadius: '7px',
                  border: 'none',
                  background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <IconList size={14} />
              </button>
            </div>

            {/* Sync Button */}
            <button 
              onClick={handleSyncClick} 
              disabled={isSyncing}
              className="glass-card" 
              style={{ 
                padding: '7px 10px', 
                fontWeight: 800, 
                display: 'flex', 
                gap: '5px', 
                alignItems: 'center', 
                fontSize: '11px', 
                cursor: 'pointer', 
                color: 'var(--text)', 
                opacity: isSyncing ? 0.6 : 1 
              }}
              title="Sync newest messages from Telegram"
            >
              <IconRefresh size={13} className={isSyncing ? 'spin' : ''} /> 
              <span className="hide-mobile-extra">SYNC</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Box & Sort (Full width responsive) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex' }}>
              <IconSearch size={15} />
            </div>
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 32px 10px 34px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex'
                }}
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '11px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="largest">Largest</option>
              <option value="smallest">Smallest</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        {/* Row 3: Category Filter Pills */}
        <div className="tabs-scroll-container">
          {[
            { id: 'all', label: 'All', count: categoryCounts.all },
            { id: 'image', label: 'Photos', count: categoryCounts.image },
            { id: 'video', label: 'Videos', count: categoryCounts.video },
            { id: 'document', label: 'Documents', count: categoryCounts.document },
            { id: 'audio', label: 'Audio', count: categoryCounts.audio },
            { id: 'archive', label: 'Archives', count: categoryCounts.archive },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id as FileCategory)}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                border: categoryFilter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: categoryFilter === tab.id ? 'var(--primary-light)' : 'var(--surface)',
                color: categoryFilter === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
              <span style={{ 
                opacity: 0.8, 
                fontSize: '9px', 
                background: 'rgba(0,0,0,0.06)', 
                padding: '1px 5px', 
                borderRadius: '100px' 
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedFiles.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', margin: '30px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800 }}>No files found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 16px 0' }}>
            {searchQuery ? `No files match "${searchQuery}"` : `No files in category "${categoryFilter}"`}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
            style={{
              padding: '8px 20px',
              borderRadius: '100px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            RESET FILTERS
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && Object.keys(groups).map(date => (
        <div key={date} style={{ marginBottom: '24px' }}>
          <div 
            style={{ 
              position: 'sticky', 
              top: '56px', 
              zIndex: 10, 
              padding: '6px 12px', 
              borderRadius: '10px', 
              marginBottom: '10px', 
              fontSize: '10px', 
              fontWeight: 800, 
              letterSpacing: '0.8px', 
              color: 'var(--text-secondary)',
              display: 'inline-block'
            }} 
            className="glass-card"
          >
            {date.toUpperCase()} • <span style={{ opacity: 0.6 }}>{groups[date].length}</span>
          </div>

          <div className="gallery-grid">
            {groups[date].map((f) => (
              <CloudItem 
                key={f.messageId} 
                file={f} 
                isSelected={selectedIds.has(f.messageId)}
                isSelectMode={isSelectMode}
                onToggleSelect={() => toggleSelectId(f.messageId)}
                onClick={() => setSelectedIndex(initialFiles.indexOf(f))} 
                onQuickDownload={() => handleDownloadSingle(f)}
                onQuickDelete={() => setDeleteModalState({ open: true, filesToDelete: [f] })}
              />
            ))}
          </div>
        </div>
      ))}

      {/* List View */}
      {viewMode === 'list' && filteredAndSortedFiles.length > 0 && (
        <div className="file-list-view">
          {filteredAndSortedFiles.map((f) => {
            const size = formatBytes(f.size);
            const dateStr = new Date(f.date * 1000).toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric' 
            });

            return (
              <div 
                key={f.messageId} 
                className={`file-list-item ${selectedIds.has(f.messageId) ? 'selected' : ''}`}
                onClick={() => {
                  if (isSelectMode) toggleSelectId(f.messageId);
                  else setSelectedIndex(initialFiles.indexOf(f));
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(f.messageId)}
                    onChange={() => toggleSelectId(f.messageId)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  
                  {/* Category Icon */}
                  <div style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: '8px', 
                    background: 'var(--surface-secondary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {f.category === 'video' ? <IconVideo size={16} color="var(--accent-video)" /> :
                     f.category === 'audio' ? <IconMusic size={16} color="var(--accent-audio)" /> :
                     f.category === 'document' ? <IconFileText size={16} color="var(--accent-doc)" /> :
                     f.category === 'archive' ? <IconArchive size={16} color="var(--accent-other)" /> :
                     <IconImage size={16} color="var(--primary)" />}
                  </div>

                  {/* File name & category */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '12px', 
                      color: 'var(--text)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '1px' }}>
                      <span>{f.category.toUpperCase()}</span>
                      <span>•</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                {/* Right metadata & actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    {size.val} {size.unit}
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownloadSingle(f); }}
                      style={{ 
                        background: 'var(--accent)', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        padding: '6px 8px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Download"
                    >
                      <IconDownload size={13} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteModalState({ open: true, filesToDelete: [f] }); }}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: 'none', 
                        color: 'var(--error)', 
                        padding: '6px 8px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Delete"
                    >
                      <IconTrash size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar for Multi-select (Responsive Mobile Bottom Bar) */}
      {isSelectMode && (
        <div className="floating-action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {selectedIds.size} selected
            </span>
            {selectedIds.size > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                ({formattedSelectedSize.val} {formattedSelectedSize.unit})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {selectedIds.size < filteredAndSortedFiles.length ? (
              <button 
                onClick={selectAll} 
                style={{ 
                  background: 'var(--accent)', 
                  border: 'none', 
                  color: 'var(--primary)', 
                  fontWeight: 800, 
                  fontSize: '10px', 
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '100px'
                }}
              >
                SELECT ALL
              </button>
            ) : (
              <button 
                onClick={deselectAll} 
                style={{ 
                  background: 'var(--accent)', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  fontWeight: 800, 
                  fontSize: '10px', 
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '100px'
                }}
              >
                DESELECT
              </button>
            )}

            {/* DOWNLOAD BUTTON */}
            <button 
              onClick={handleBatchDownloadSelected} 
              disabled={selectedIds.size === 0}
              style={{ 
                background: selectedIds.size > 0 ? 'var(--primary)' : 'var(--border)', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '100px', 
                fontWeight: 800, 
                fontSize: '11px', 
                cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: selectedIds.size > 0 ? '0 4px 14px var(--primary-glow)' : 'none'
              }}
              title="Download selected photos/files"
            >
              <IconDownload size={13} />
              <span>DOWNLOAD {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}</span>
            </button>

            {/* DELETE BUTTON */}
            {selectedIds.size > 0 && (
              <button 
                onClick={() => {
                  const toDelete = filteredAndSortedFiles.filter(f => selectedIds.has(f.messageId));
                  setDeleteModalState({ open: true, filesToDelete: toDelete });
                }} 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: 'var(--error)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  padding: '8px 12px', 
                  borderRadius: '100px', 
                  fontWeight: 800, 
                  fontSize: '11px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <IconTrash size={13} />
              </button>
            )}

            {/* CLOSE SELECT */}
            <button 
              onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Cancel Selection"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Load More Media Button */}
      {filteredAndSortedFiles.length > 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0 20px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={(e) => { e.preventDefault(); onLoadMore(); }} 
            disabled={loadingMore}
            style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 36px', 
              borderRadius: '100px', 
              fontWeight: 800, 
              fontSize: '11px', 
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
              opacity: loadingMore ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loadingMore ? <IconRefresh size={14} className="spin" /> : <IconSparkles size={14} />}
            {loadingMore ? 'PULLING NODES...' : 'LOAD MORE MEDIA'}
          </button>
        </div>
      )}

      {/* Media Viewer Lightbox */}
      {selectedIndex !== null && (
        <MediaViewer 
          files={initialFiles} 
          currentIndex={selectedIndex} 
          onClose={() => setSelectedIndex(null)} 
          onIndexChange={setSelectedIndex}
          onDelete={async (id: number) => { 
            const f = initialFiles.find(x => x.messageId === id);
            await deleteFileFromTelegram(id); 
            if (f) onFileDeleted?.(id, f.size, f.category);
            setSelectedIndex(null); 
            showToast('File deleted from Telegram');
          }}
          onDownload={handleDownloadSingle}
        />
      )}
    </div>
  );
};

export default CloudGallery;
