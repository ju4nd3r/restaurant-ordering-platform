import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageService } from './local-storage.service';
import * as fs from 'fs';
import * as path from 'path';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testUploadDir = path.join(process.cwd(), 'test-uploads-scratch');

  beforeAll(() => {
    process.env.UPLOAD_DIR = testUploadDir;
  });

  afterAll(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStorageService],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
    service.onModuleInit();
  });

  it('should be defined and initialize upload directory', () => {
    expect(service).toBeDefined();
    expect(fs.existsSync(testUploadDir)).toBe(true);
  });

  it('should upload a buffer and return the public URL', async () => {
    const content = Buffer.from('test image content');
    const filename = 'test-image.webp';

    const url = await service.uploadFile(content, filename);
    expect(url).toBe('/api/uploads/test-image.webp');
    expect(fs.existsSync(path.join(testUploadDir, filename))).toBe(true);
  });

  it('should delete an existing file gracefully', async () => {
    const content = Buffer.from('to be deleted');
    const filename = 'delete-me.webp';
    await service.uploadFile(content, filename);

    await service.deleteFile(`/api/uploads/${filename}`);
    expect(fs.existsSync(path.join(testUploadDir, filename))).toBe(false);
  });

  it('should not throw when deleting a non-existent file', async () => {
    await expect(service.deleteFile('/api/uploads/non-existent.webp')).resolves.not.toThrow();
  });
});
