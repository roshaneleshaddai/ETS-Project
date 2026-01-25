import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './customers.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
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
}
