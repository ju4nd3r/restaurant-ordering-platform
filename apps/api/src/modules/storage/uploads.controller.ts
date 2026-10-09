import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly localStorageService: LocalStorageService) {}

  @Get(':filename')
  @ApiOperation({ summary: 'Obtener archivo estático de imagen cargada' })
  @ApiParam({ name: 'filename', description: 'Nombre del archivo de imagen' })
  @ApiResponse({ status: 200, description: 'Archivo de imagen retornado exitosamente' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const uploadDir = path.resolve(this.localStorageService.getUploadDir());
    const safeFilename = path.basename(filename);
    const resolvedPath = path.resolve(uploadDir, safeFilename);

    // Prevent path traversal
    if (!resolvedPath.startsWith(uploadDir)) {
      throw new ForbiddenException('Acceso a ruta denegado');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundException('Archivo de imagen no encontrado');
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === '.webp'
        ? 'image/webp'
        : ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.svg'
              ? 'image/svg+xml'
              : 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    const readStream = fs.createReadStream(resolvedPath);
    readStream.pipe(res);
  }
}
