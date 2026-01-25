import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './customers.schema';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

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
  async findByEmail(@Param('email') email: string): Promise<Customer | null> {
    return this.customersService.findByEmail(email);
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
}
