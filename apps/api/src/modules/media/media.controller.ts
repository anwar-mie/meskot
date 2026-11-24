import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MediaService, type UploadedFilePayload } from './media.service';

@ApiTags('Media Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query('folder') folder?: string,
  ) {
    const safeFolder =
      folder === 'returns' || folder === 'deliveries' ? folder : 'products';
    return this.mediaService.uploadImage(file, safeFolder);
  }
}
