import {
  Controller,
  Get,
  Param,
  Delete,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Body,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserResponse } from './responses';
import { JwtPayload } from '@auth/types';
import { CurrentUser } from '@common/decorators';
import { User } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  async findOneUser(@Param('idOrEmail') idOrEmail: string) {
    const user = await this.userService.findOne(idOrEmail);
    if (!user) {
      return null;
    } else {
      return new UserResponse(user);
    }
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') user: JwtPayload,
  ) {
    return this.userService.delete(id, user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Put()
  async updateUser(@Body() body: Partial<User>) {
    const user = await this.userService.save(body);

    return new UserResponse(user);
  }
}
