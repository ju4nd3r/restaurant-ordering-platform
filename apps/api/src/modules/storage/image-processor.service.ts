import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImages {
  fullBuffer: Buffer;
  thumbBuffer: Buffer;
  blurPlaceholder: string;
}

@Injectable()
export class ImageProcessorService {
  async processDishImage(inputBuffer: Buffer): Promise<ProcessedImages> {
    try {
      // 1. Full responsive WebP (max 800x800, quality 85)
      const fullBuffer = await sharp(inputBuffer)
        .rotate() // auto-orient based on EXIF
        .resize({
          width: 800,
          height: 800,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();

      // 2. Thumbnail WebP (200x200, quality 80)
      const thumbBuffer = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: 200,
          height: 200,
          fit: 'cover',
        })
        .webp({ quality: 80 })
        .toBuffer();

      // 3. Ultra-light blur placeholder (16x16) for instant mobile LQIP
      const blurBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(16, 16, { fit: 'inside' })
        .webp({ quality: 40 })
        .toBuffer();

      const blurPlaceholder = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

      return {
        fullBuffer,
        thumbBuffer,
        blurPlaceholder,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error procesando la imagen. Asegúrese de que sea un formato de imagen válido: ${(error as Error).message}`,
      );
    }
  }
}
