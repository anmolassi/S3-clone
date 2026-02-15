import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('v1-upload')
export class V1UploadController {
  @Post('file')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    body.uploadId = '123-test';
    const uploadDir = path.join(
      process.cwd(),
      'uploads',
      body.uploadId || 'temp',
    );

    await fs.promises.mkdir(uploadDir, { recursive: true });

    const chunkIndex = body.chunkIndex ?? 'unknown';
    const filePath = path.join(uploadDir, `part_${chunkIndex}`);

    // NOTE: Multer already buffered this chunk in memory
    await fs.promises.writeFile(filePath, file.buffer);

    return {
      ok: true,
      chunkIndex,
      size: file.size,
    };
  }

  @Get('download-chunks/:uploadId')
  async streamChunksWithRange(
    @Param('uploadId') uploadId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const uploadDir = path.join(process.cwd(), 'uploads', uploadId);

    const files = await fs.promises.readdir(uploadDir);

    const chunks = files
      .filter((f) => f.startsWith('part_'))
      .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));

    if (!chunks.length) {
      return res.status(404).send('File not found');
    }

    // ---- Build chunk metadata ----
    const chunkSizes: number[] = [];
    let totalSize = 0;

    for (const file of chunks) {
      const stats = await fs.promises.stat(path.join(uploadDir, file));
      chunkSizes.push(stats.size);
      totalSize += stats.size;
    }

    const range = req.headers.range;
    if (!range) {
      return res.status(416).send('Range header required');
    }

    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return res.status(416).send('Invalid range');
    }

    const start = parseInt(match[1], 10);

    if (start >= totalSize) {
      return res.status(416).send('Requested range not satisfiable');
    }

    // ----- Server-side window cap (rate limiting protection) -----
    const MAX_WINDOW = 5 * 1024 * 1024; // 5MB per response

    const clientRequestedEnd = match[2]
      ? parseInt(match[2], 10)
      : totalSize - 1;

    const effectiveEnd = Math.min(
      clientRequestedEnd,
      start + MAX_WINDOW - 1,
      totalSize - 1,
    );

    if (effectiveEnd < start) {
      return res.status(416).send('Requested range not satisfiable');
    }

    const contentLength = effectiveEnd - start + 1;

    // ---- Honest headers ----
    res.status(206);
    res.setHeader(
      'Content-Range',
      `bytes ${start}-${effectiveEnd}/${totalSize}`,
    );
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Type', 'video/mp4');

    // ---- Stream intersecting chunks ----
    let currentOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkSize = chunkSizes[i];
      const chunkStart = currentOffset;
      const chunkEnd = currentOffset + chunkSize - 1;

      // Skip chunks outside range
      if (chunkEnd < start || chunkStart > effectiveEnd) {
        currentOffset += chunkSize;
        continue;
      }

      const readStart = Math.max(start, chunkStart) - chunkStart;
      const readEnd = Math.min(effectiveEnd, chunkEnd) - chunkStart;

      await new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(path.join(uploadDir, chunks[i]), {
          start: readStart,
          end: readEnd,
        });

        stream.pipe(res, { end: false });
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      currentOffset += chunkSize;

      if (currentOffset > effectiveEnd) break;
    }

    res.end();
  }

  @Get('download-stream/:uploadId')
  async streamChunks(
    @Param('uploadId') uploadId: string,
    @Res() res: Response,
  ) {
    const uploadDir = path.join(process.cwd(), 'uploads', uploadId);

    const files = await fs.promises.readdir(uploadDir);
    const chunks = files
      .filter((f) => f.startsWith('part_'))
      .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));

    console.log('anmol', chunks);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${'anmol'}.mp4"`,
    );
    res.setHeader('Accept-Ranges', 'bytes');

    for (const chunk of chunks) {
      const chunkPath = path.join(uploadDir, chunk);
      console.log('anmol', chunkPath);
      await new Promise<void>((resolve, reject) => {
        const rs = fs.createReadStream(chunkPath);
        rs.pipe(res, { end: false });
        rs.on('end', resolve);
        rs.on('error', reject);
      });
    }

    res.end();
  }
}
