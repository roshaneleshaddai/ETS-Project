import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket, TicketStatus } from './tickets.schema';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async create(@Body() ticket: Ticket): Promise<Ticket> {
    return this.ticketsService.create(ticket);
  }

  @Get()
  async findAll(): Promise<Ticket[]> {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.findOne(id);
  }

  @Get('code/:ticketCode')
  async findByTicketCode(
    @Param('ticketCode') ticketCode: string,
  ): Promise<Ticket | null> {
    return this.ticketsService.findByTicketCode(ticketCode);
  }

  @Get('event/:eventId')
  async findByEventId(@Param('eventId') eventId: string): Promise<Ticket[]> {
    return this.ticketsService.findByEventId(eventId);
  }

  @Get('customer/:customerId')
  async findByCustomerId(
    @Param('customerId') customerId: string,
  ): Promise<Ticket[]> {
    return this.ticketsService.findByCustomerId(customerId);
  }

  @Get('order/:orderId')
  async findByOrderId(@Param('orderId') orderId: string): Promise<Ticket[]> {
    return this.ticketsService.findByOrderId(orderId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() ticket: Ticket,
  ): Promise<Ticket> {
    return this.ticketsService.update(id, ticket);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
  ): Promise<Ticket> {
    return this.ticketsService.updateStatus(id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.delete(id);
  }
}
