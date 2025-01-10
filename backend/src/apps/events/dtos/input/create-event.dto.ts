import {
  IsString,
  IsNotEmpty,
  IsDateString,
  ArrayNotEmpty,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateParticipantInputDto } from '../../../participants/dtos/input/create-participant.dto';
import { EVENT_TYPE } from '../../../../common/types/event.type';

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

  @ApiProperty({
    description: 'The type of the event',
    enum: EVENT_TYPE,
    default: EVENT_TYPE.PERSONAL,
  })
  @IsEnum(EVENT_TYPE)
  type: EVENT_TYPE;

  @ApiProperty({
    description: 'The list of participants',
    type: [CreateParticipantInputDto],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateParticipantInputDto)
  @ArrayNotEmpty({ message: 'Event must have at least one participant' })
  participants: CreateParticipantInputDto[];
}
