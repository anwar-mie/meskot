import { describe, expect, test } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { detectImageMagicBytes, MediaService } from './media.service';

describe('MediaService image upload security validation', () => {
  const service = new MediaService();

  test('detects valid PNG, JPEG, and WebP magic bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);

    expect(detectImageMagicBytes(png)).toBe('png');
    expect(detectImageMagicBytes(jpg)).toBe('jpg');
    expect(detectImageMagicBytes(webp)).toBe('webp');
    expect(service.validateImage({ originalname: 'a.png', mimetype: 'image/png', size: png.length, buffer: png })).toEqual({
      ext: 'png',
      mime: 'image/png',
    });
  });

  test('rejects spoofed MIME type whose bytes are not an image', () => {
    const fakePng = Buffer.from('<script>alert(1)</script>');
    expect(() =>
      service.validateImage({
        originalname: 'evil.png',
        mimetype: 'image/png',
        size: fakePng.length,
        buffer: fakePng,
      }),
    ).toThrow(BadRequestException);
  });

  test('rejects files larger than 5 MB', () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    oversized[0] = 0xff;
    oversized[1] = 0xd8;
    oversized[2] = 0xff;
    expect(() =>
      service.validateImage({
        originalname: 'huge.jpg',
        mimetype: 'image/jpeg',
        size: oversized.length,
        buffer: oversized,
      }),
    ).toThrow(BadRequestException);
  });
});
