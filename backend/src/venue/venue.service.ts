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
  async findAll(filters?: { location?: string }): Promise<Venue[]> {
    const query: any = {};

    if (filters?.location) {
      query.location = new RegExp(filters.location, 'i');
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
   * Search venues by name or location
   */
  async search(searchTerm: string): Promise<Venue[]> {
    const venues = await this.venueModel
      .find({
        $or: [
          { name: new RegExp(searchTerm, 'i') },
          { location: new RegExp(searchTerm, 'i') },
        ],
      })
      .lean();

    return venues;
  }

  /**
   * Get venue statistics
   */
  async getVenueStats(venueId: string) {
    const venue = await this.findById(venueId);

    const zoneStats = venue.zones.map((zone) => {
      const zoneSeats = venue.seats.filter((seat) => seat.z_id === zone.id);
      return {
        zoneId: zone.id,
        name: zone.name,
        basePrice: zone.base_price,
        totalSeats: zoneSeats.length,
      };
    });

    return {
      venueId: (venue as any)._id.toString(),
      venueName: venue.name,
      location: venue.location,
      totalSeats: venue.seats.length,
      totalZones: venue.zones.length,
      zoneStats,
    };
  }
}
