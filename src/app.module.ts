import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { V1UploadController } from './v1-upload/v1-upload.controller';
import { V1UploadService } from './v1-upload/v1-upload.service';

@Module({
  imports: [],
  controllers: [AppController, V1UploadController],
  providers: [AppService, V1UploadService],
})
export class AppModule {}
