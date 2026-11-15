export type UploadStatus = 'IDLE' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
export type DownloadStatus = 'IDLE' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';
export type FileCategory = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

export interface LocalFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface CloudFile {
  messageId: number;
  name: string;
  size: number;
  date: number;
  mimeType: string;
  category: FileCategory;
  downloadStatus: DownloadStatus;
  downloadProgress: number;
  isVideo: boolean;
  isAudio: boolean;
  isImage: boolean;
  duration?: number;
  selected?: boolean;
}

export interface StorageMetricsData {
  totalBytes: number;
  photoBytes: number;
  videoBytes: number;
  docBytes: number;
  audioBytes: number;
  otherBytes: number;
  totalCount: number;
  photoCount: number;
  videoCount: number;
  docCount: number;
  audioCount: number;
  otherCount: number;
  lastUpdated: number;
  isScanning?: boolean;
}

export interface TeleUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  phone?: string;
  dcId?: number;
}
