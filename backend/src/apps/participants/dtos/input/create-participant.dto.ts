import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateParticipantInputDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  role?: string; // 'viewer', 'editor', 'organizer'

  @IsString()
  @IsNotEmpty()
  eventId?: string;
}
