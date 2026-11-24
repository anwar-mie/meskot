import { BadRequestException, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface UploadedFilePayload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function detectImageMagicBytes(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

@Injectable()
export class MediaService {
  private readonly s3Client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'meskot-media';
    this.publicBaseUrl = (
      process.env.S3_PUBLIC_URL ?? `http://localhost:9000/${this.bucket}`
    ).replace(/\/$/, '');

    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;

    this.s3Client =
      endpoint && accessKeyId && secretAccessKey
        ? new S3Client({
            region: process.env.S3_REGION ?? 'us-east-1',
            endpoint,
            forcePathStyle: true,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  validateImage(file: UploadedFilePayload | undefined): { ext: string; mime: string } {
    if (!file || !file.buffer) {
      throw new BadRequestException('Image file is required');
    }
    if (file.size > MAX_BYTES || file.buffer.length > MAX_BYTES) {
      throw new BadRequestException('Image exceeds the 5 MB limit');
    }
    const extByMime = ALLOWED_MIME_TO_EXT[file.mimetype];
    if (!extByMime) {
      throw new BadRequestException('Only JPG, PNG, and WebP images are allowed');
    }
    const detected = detectImageMagicBytes(file.buffer);
    if (!detected || detected !== extByMime) {
      throw new BadRequestException('File content does not match a valid JPG, PNG, or WebP image');
    }
    return { ext: detected, mime: file.mimetype };
  }

  async uploadImage(
    file: UploadedFilePayload | undefined,
    folder: 'products' | 'returns' | 'deliveries' = 'products',
  ) {
    const { ext, mime } = this.validateImage(file);
    const filename = `${crypto.randomUUID()}.${ext}`;
    const objectKey = `${folder}/${filename}`;

    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
            Body: file!.buffer,
            ContentType: mime,
          }),
        );
        return {
          url: `${this.publicBaseUrl}/${objectKey}`,
          key: objectKey,
          storage: 's3',
        };
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw err;
        }
        // In local dev when MinIO/Docker isn't running, fall back to Next.js public/uploads
      }
    }

    const localDir = path.resolve(process.cwd(), '../web/public/uploads', folder);
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.join(localDir, filename), file!.buffer);

    return {
      url: `/uploads/${folder}/${filename}`,
      key: objectKey,
      storage: 'local-dev',
    };
  }
}
