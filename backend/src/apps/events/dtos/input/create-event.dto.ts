import {
  IsString,
  IsNotEmpty,
  IsDateString,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { CreateParticipantInputDto } from '../../../participants/dtos/input/create-participant.dto';
import { Type } from 'class-transformer';

export class CreateEventInputDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @ValidateNested({ each: true })
  @Type(() => CreateParticipantInputDto)
  @ArrayNotEmpty({ message: 'Event must have at least one participant' })
  participants: CreateParticipantInputDto[];
}
