export type UploadStatus = 'IDLE' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
export type DownloadStatus = 'IDLE' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';

export interface LocalFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  progress: number;
}

export interface CloudFile {
  messageId: number;
  name: string;
  size: number;
  date: number;
  mimeType: string;
  downloadStatus: DownloadStatus;
  downloadProgress: number;
  thumbnail?: any;
  isVideo: boolean;
  duration?: number; 
  selected?: boolean;
}

export interface TeleUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}