import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './customers.schema';
import { EventsService } from '../events/events.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private readonly eventsService: EventsService,
  ) {}

  async create(customer: Customer): Promise<Customer> {
    try {
      const createdCustomer = new this.customerModel(customer);
      return await createdCustomer.save();
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  async findAll(): Promise<Customer[]> {
    try {
      return await this.customerModel.find().exec();
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Customer> {
    try {
      const customer = await this.customerModel.findById(id).exec();
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      return customer;
    } catch (error) {
      console.error('Error in findOne:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Customer | null> {
    try {
      return await this.customerModel
        .findOne({ 'encryptedPII.email': email })
        .exec();
    } catch (error) {
      console.error('Error in findByEmail:', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    try {
      return await this.customerModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    } catch (error) {
      console.error('Error in findByUserId:', error);
      throw error;
    }
  }

  async findByLoyaltyId(loyaltyId: string): Promise<Customer | null> {
    try {
      return await this.customerModel
        .findOne({ 'loyalty.loyaltyId': loyaltyId })
        .exec();
    } catch (error) {
      console.error('Error in findByLoyaltyId:', error);
      throw error;
    }
  }

  async update(id: string, customer: Customer): Promise<Customer> {
    try {
      const updatedCustomer = await this.customerModel
        .findByIdAndUpdate(id, customer, { new: true })
        .exec();
      if (!updatedCustomer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      return updatedCustomer;
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<Customer> {
    try {
      const deletedCustomer = await this.customerModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedCustomer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      return deletedCustomer;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  async likeEvent(customerId: string, eventId: string): Promise<Customer> {
    try {
      // First, verify the customer exists
      const customer = await this.customerModel.findById(customerId).exec();
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Check if the event is already liked
      const alreadyLiked = customer.likedEvents?.some(
        (id) => id.toString() === eventId,
      );

      if (alreadyLiked) {
        throw new Error('Event already liked by this customer');
      }

      // Increment the like count on the event
      await this.eventsService.incrementLike(eventId);

      // Add the event to the customer's likedEvents array
      const updatedCustomer = await this.customerModel
        .findByIdAndUpdate(
          customerId,
          { $addToSet: { likedEvents: eventId } },
          { new: true },
        )
        .exec();

      if (!updatedCustomer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      return updatedCustomer;
    } catch (error) {
      console.error('Error in likeEvent:', error);
      throw error;
    }
  }

  async unlikeEvent(customerId: string, eventId: string): Promise<Customer> {
    try {
      // First, verify the customer exists
      const customer = await this.customerModel.findById(customerId).exec();
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Check if the event is in the liked events
      const isLiked = customer.likedEvents?.some(
        (id) => id.toString() === eventId,
      );

      if (!isLiked) {
        throw new Error('Event not in liked events');
      }

      // Decrement the like count on the event
      await this.eventsService.decrementLike(eventId);

      // Remove the event from the customer's likedEvents array
      const updatedCustomer = await this.customerModel
        .findByIdAndUpdate(
          customerId,
          { $pull: { likedEvents: eventId } },
          { new: true },
        )
        .exec();

      if (!updatedCustomer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      return updatedCustomer;
    } catch (error) {
      console.error('Error in unlikeEvent:', error);
      throw error;
    }
  }
}
