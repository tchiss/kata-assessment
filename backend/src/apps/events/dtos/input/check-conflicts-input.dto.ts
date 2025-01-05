import { IsArray, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CheckConflictsInputDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds: string[];
}
