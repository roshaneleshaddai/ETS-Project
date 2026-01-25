import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketDocument, TicketStatus } from './tickets.schema';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private ticketModel: Model<TicketDocument>,
  ) {}

  async create(ticket: Ticket): Promise<Ticket> {
    try {
      const createdTicket = new this.ticketModel(ticket);
      return await createdTicket.save();
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  async findAll(): Promise<Ticket[]> {
    try {
      return await this.ticketModel.find().exec();
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Ticket> {
    try {
      const ticket = await this.ticketModel.findById(id).exec();
      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }
      return ticket;
    } catch (error) {
      console.error('Error in findOne:', error);
      throw error;
    }
  }

  async findByTicketCode(ticketCode: string): Promise<Ticket | null> {
    try {
      return await this.ticketModel.findOne({ ticketCode }).exec();
    } catch (error) {
      console.error('Error in findByTicketCode:', error);
      throw error;
    }
  }

  async findByEventId(eventId: string): Promise<Ticket[]> {
    try {
      return await this.ticketModel.find({ eventId }).exec();
    } catch (error) {
      console.error('Error in findByEventId:', error);
      throw error;
    }
  }

  async findByCustomerId(customerId: string): Promise<Ticket[]> {
    try {
      return await this.ticketModel.find({ customerId }).exec();
    } catch (error) {
      console.error('Error in findByCustomerId:', error);
      throw error;
    }
  }

  async findByOrderId(orderId: string): Promise<Ticket[]> {
    try {
      return await this.ticketModel.find({ orderId }).exec();
    } catch (error) {
      console.error('Error in findByOrderId:', error);
      throw error;
    }
  }

  async update(id: string, ticket: Ticket): Promise<Ticket> {
    try {
      const updatedTicket = await this.ticketModel
        .findByIdAndUpdate(id, ticket, { new: true })
        .exec();
      if (!updatedTicket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }
      return updatedTicket;
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket> {
    try {
      const updateData: any = { status };

      // If status is SCANNED, also update scannedAt timestamp
      if (status === TicketStatus.SCANNED) {
        updateData.scannedAt = new Date();
      }

      const updatedTicket = await this.ticketModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedTicket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }
      return updatedTicket;
    } catch (error) {
      console.error('Error in updateStatus:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<Ticket> {
    try {
      const deletedTicket = await this.ticketModel.findByIdAndDelete(id).exec();
      if (!deletedTicket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }
      return deletedTicket;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }
}
