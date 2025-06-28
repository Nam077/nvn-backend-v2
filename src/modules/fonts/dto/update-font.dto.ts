import { PartialType } from '@nestjs/swagger';

import { CreateFontDto } from '@/modules/fonts/dto/create-font.dto';

export class UpdateFontDto extends PartialType(CreateFontDto) {}
