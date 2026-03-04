import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'api_gpsdozor', description: 'Username' })
    @IsString()
    username: string;

    @ApiProperty({ example: 'yakmwlARdn', description: 'Password' })
    @IsString()
    @MinLength(6)
    password: string;
}
