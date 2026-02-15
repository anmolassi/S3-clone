import { Test, TestingModule } from '@nestjs/testing';
import { V1UploadController } from './v1-upload.controller';

describe('V1UploadController', () => {
  let controller: V1UploadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [V1UploadController],
    }).compile();

    controller = module.get<V1UploadController>(V1UploadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
