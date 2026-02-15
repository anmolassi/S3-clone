import { Test, TestingModule } from '@nestjs/testing';
import { V1UploadService } from './v1-upload.service';

describe('V1UploadService', () => {
  let service: V1UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [V1UploadService],
    }).compile();

    service = module.get<V1UploadService>(V1UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
