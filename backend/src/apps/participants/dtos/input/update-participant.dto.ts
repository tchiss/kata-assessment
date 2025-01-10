import { CreateParticipantInputDto } from './create-participant.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateParticipantDto extends PartialType(
  CreateParticipantInputDto,
) {
  @ApiProperty({ description: 'The email of the participant' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
