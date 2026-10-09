import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { ImageProcessorService } from './image-processor.service';
import { UploadsController } from './uploads.controller';
import { STORAGE_SERVICE_TOKEN } from './storage.interface';

@Module({
  controllers: [UploadsController],
  providers: [
    LocalStorageService,
    ImageProcessorService,
    {
      provide: STORAGE_SERVICE_TOKEN,
      useExisting: LocalStorageService,
    },
  ],
  exports: [STORAGE_SERVICE_TOKEN, LocalStorageService, ImageProcessorService],
})
export class StorageModule {}
