import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService, OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  }

  onModuleInit() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Directorio de uploads local inicializado en: ${this.uploadDir}`);
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    const sanitizedFilename = path.basename(filename);
    const targetPath = path.join(this.uploadDir, sanitizedFilename);
    await fs.promises.writeFile(targetPath, buffer);
    return `/api/uploads/${sanitizedFilename}`;
  }

  async deleteFile(fileUrlOrKey: string): Promise<void> {
    try {
      const filename = path.basename(fileUrlOrKey);
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Archivo eliminado: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`No se pudo eliminar el archivo ${fileUrlOrKey}: ${(error as Error).message}`);
    }
  }
}
