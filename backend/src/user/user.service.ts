import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<User[]> {
    try {
      const res = await this.userModel.find();
      if (!res) {
        throw new Error('No users found');
      }
      return res;
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const res = await this.userModel.findById(id);
      console.log('id', id);
      if (!res) {
        throw new Error('User not found');
      }
      return res;
    } catch (error) {
      console.error('Error in findOne:', error);
      throw error;
    }
  }

  async create(user: User): Promise<User> {
    try {
      const res = await this.userModel.create(user);
      if (!res) {
        throw new Error('user not created');
      }
      return res;
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  async update(id: string, user: User): Promise<User> {
    try {
      const res = await this.userModel.findByIdAndUpdate(id, user);
      if (!res) {
        throw new Error('User not found');
      }
      return res;
    } catch (Error) {
      console.error('Error in update:', Error);
      throw Error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      const res = await this.userModel.findOne({ email });
      return res;
    } catch (error) {
      console.error('Error in findByEmail:', error);
      throw error;
    }
  }
}
