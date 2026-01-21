import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.schema';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findall() {
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id')
    id: string,
  ) {
    return this.userService.findOne(id);
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Post()
  async create(
    @Body()
    user: User,
  ) {
    return this.userService.create(user);
  }

  @Put(':id')
  async update(
    @Body()
    user: User,
    @Param('id')
    id: string,
  ) {
    return this.userService.update(id, user);
  }
}
