import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  NotFoundException,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './customers.schema';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Post()
  async create(@Body() customer: Customer): Promise<Customer> {
    return this.customersService.create(customer);
  }

  @Get()
  async findAll(): Promise<Customer[]> {
    return this.customersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Customer> {
    return this.customersService.findOne(id);
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string): Promise<Customer> {
    const customer = await this.customersService.findByEmail(email);
    if (!customer) {
      throw new NotFoundException(`Customer with email ${email} not found`);
    }
    return customer;
  }

  @Get('user/:userId')
  async findByUserId(
    @Param('userId') userId: string,
  ): Promise<Customer> {
    const customer = await this.customersService.findByUserId(userId);
    if (!customer) {
      throw new NotFoundException(`Customer with User ID ${userId} not found`);
    }
    return customer;
  }

  @Get('loyalty/:loyaltyId')
  async findByLoyaltyId(
    @Param('loyaltyId') loyaltyId: string,
  ): Promise<Customer | null> {
    return this.customersService.findByLoyaltyId(loyaltyId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() customer: Customer,
  ): Promise<Customer> {
    return this.customersService.update(id, customer);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Customer> {
    return this.customersService.delete(id);
  }

  @Post(':id/like-event')
  async likeEvent(
    @Param('id') customerId: string,
    @Body('eventId') eventId: string,
  ): Promise<Customer> {
    return this.customersService.likeEvent(customerId, eventId);
  }

  @Delete(':id/like-event')
  async unlikeEvent(
    @Param('id') customerId: string,
    @Body('eventId') eventId: string,
  ): Promise<Customer> {
    return this.customersService.unlikeEvent(customerId, eventId);
  }
}
