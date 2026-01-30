import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Venue, VenueDocument } from './venue.schema';

@Injectable()
export class VenueService {
  constructor(
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
  ) {}

  /**
   * Create a new venue
   */
  async create(venueData: any): Promise<Venue> {
    try {
      const venue = new this.venueModel(venueData);
      return await venue.save();
    } catch (error) {
      throw new BadRequestException('Failed to create venue: ' + error.message);
    }
  }

  /**
   * Find venue by ID - returns complete venue with zones and seats
   */
  async findById(venueId: string): Promise<Venue> {
    const venue = await this.venueModel.findById(venueId).lean();

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  /**
   * Find all venues
   */
  async findAll(filters?: { city?: string }): Promise<Venue[]> {
    const query: any = {};

    if (filters?.city) {
      query.city = new RegExp(filters.city, 'i');
    }

    const venues = await this.venueModel.find(query).lean();
    return venues;
  }

  /**
   * Update venue
   */
  async update(venueId: string, updateData: any): Promise<Venue> {
    const venue = await this.venueModel
      .findByIdAndUpdate(venueId, updateData, { new: true })
      .lean();

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  /**
   * Delete venue
   */
  async delete(venueId: string): Promise<void> {
    const result = await this.venueModel.deleteOne({ _id: venueId });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Venue not found');
    }
  }

  /**
   * Search venues by name, city, or address
   */
  async search(searchTerm: string): Promise<Venue[]> {
    const venues = await this.venueModel
      .find({
        $or: [
          { name: new RegExp(searchTerm, 'i') },
          { city: new RegExp(searchTerm, 'i') },
          { address: new RegExp(searchTerm, 'i') },
        ],
      })
      .lean();

    return venues;
  }

  async getVenueStats(venueId: string) {
    const venue = await this.findById(venueId);

    if (!venue.sections || !Array.isArray(venue.sections)) {
      return {
        venueId: (venue as any)._id?.toString(),
        venueName: venue.name,
        city: venue.city,
        address: venue.address,
        totalSeats: 0,
        totalSections: 0,
        sectionStats: [],
      };
    }

    const sectionStats = venue.sections.map((section) => {
      return {
        sectionId: section.id,
        name: section.name,
        color: section.color,
        totalSeats: section.seats?.length || 0,
      };
    });

    const totalSeats = venue.sections.reduce(
      (sum, section) => sum + (section.seats?.length || 0),
      0,
    );

    return {
      venueId: (venue as any)._id?.toString(),
      venueName: venue.name,
      city: venue.city,
      address: venue.address,
      totalSeats: totalSeats,
      totalSections: venue.sections.length,
      sectionStats,
      isActive: venue.isActive,
    };
  }
}
