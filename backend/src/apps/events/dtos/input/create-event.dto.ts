import {
  IsString,
  IsNotEmpty,
  IsDateString,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { CreateParticipantInputDto } from '../../../participants/dtos/input/create-participant.dto';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventInputDto {
  @ApiProperty({ description: 'The title of the event' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The start time of the event in ISO 8601 format',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'The end time of the event in ISO 8601 format' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'The type of the event', example: 'meeting' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'The list of participants',
    type: [CreateParticipantInputDto],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateParticipantInputDto)
  @ArrayNotEmpty({ message: 'Event must have at least one participant' })
  participants: CreateParticipantInputDto[];
}
