import { IsArray, IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckConflictsInputDto {
  @ApiProperty({
    description: 'The start time for conflict check in ISO 8601 format',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'The end time for conflict check in ISO 8601 format',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    description: 'The list of user IDs to check conflicts for',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  userIds?: string[];

  @ApiProperty({
    description: 'The list of user emails to check conflicts for',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  emails?: string[];
}
