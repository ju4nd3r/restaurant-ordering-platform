export interface StorageService {
  uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  deleteFile(fileUrlOrKey: string): Promise<void>;
}

export const STORAGE_SERVICE_TOKEN = Symbol('STORAGE_SERVICE_TOKEN');
