import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateParticipantInputDto {
  @ApiProperty({ description: 'The name of the participant', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'The email of the participant' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The role of the participant',
    example: 'viewer',
  })
  @IsString()
  @IsNotEmpty()
  role?: string;

  @ApiProperty({ description: 'The ID of the event', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  eventId?: string;
}
