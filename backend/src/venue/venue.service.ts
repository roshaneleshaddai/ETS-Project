import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

export interface Coordinate {
  x: number;
  y: number;
}

export interface SeatMapConfig {
  row: string;
  seatNumber: number;
  position: Coordinate;
  isAccessible?: boolean;
  isAisle?: boolean;
}

export interface VenueSection {
  sectionId: string;
  name: string;
  color: string;
  boundary: Coordinate[];
  seats: SeatMapConfig[];
  defaultPriceCategory?: string;
}

export interface VenueResponse {
  _id: string;
  name: string;
  city: string;
  address?: string;
  sections: VenueSection[];
  mapDimensions: { width: number; height: number };
  stagePosition?: Coordinate;
  isActive: boolean;
  totalCapacity?: number;
  metadata?: any;
}

export interface VenueStatsResponse {
  venueId: string;
  venueName: string;
  totalCapacity: number;
  totalSections: number;
  sectionStats: Array<{
    sectionId: string;
    name: string;
    totalSeats: number;
    accessibleSeats: number;
    aisleSeats: number;
  }>;
}

@Injectable()
export class VenueService {
  constructor(
    @InjectModel('Venue') private venueModel: Model<any>,
  ) {}

  /**
   * Create a new venue
   */
  async create(venueData: Partial<VenueResponse>): Promise<VenueResponse> {
    try {
      let totalCapacity = 0;
      if (venueData.sections) {
        venueData.sections.forEach(section => {
          totalCapacity += section.seats?.length || 0;
        });
      }

      const venue = new this.venueModel({
        ...venueData,
        totalCapacity,
        isActive: true,
      });

      const saved = await venue.save();
      return this.mapVenueToResponse(saved);
    } catch (error) {
      throw new BadRequestException('Failed to create venue: ' + error.message);
    }
  }

  /**
   * Find venue by ID
   */
  async findById(venueId: string): Promise<VenueResponse> {
    const venue = await this.venueModel.findById(venueId).lean();
    
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return this.mapVenueToResponse(venue);
  }

  /**
   * Find all venues
   */
  async findAll(filters?: { city?: string; isActive?: boolean }): Promise<VenueResponse[]> {
    const query: any = {};

    if (filters?.city) {
      query.city = new RegExp(filters.city, 'i');
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const venues = await this.venueModel.find(query).lean();
    return venues.map(venue => this.mapVenueToResponse(venue));
  }

  /**
   * Update venue
   */
  async update(venueId: string, updateData: Partial<VenueResponse>): Promise<VenueResponse> {
    if (updateData.sections) {
      let totalCapacity = 0;
      updateData.sections.forEach(section => {
        totalCapacity += section.seats?.length || 0;
      });
      updateData.totalCapacity = totalCapacity;
    }

    const venue = await this.venueModel.findByIdAndUpdate(
      venueId,
      updateData,
      { new: true }
    ).lean();

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return this.mapVenueToResponse(venue);
  }

  /**
   * Delete/Deactivate venue
   */
  async delete(venueId: string, hardDelete: boolean = false): Promise<void> {
    if (hardDelete) {
      const result = await this.venueModel.deleteOne({ _id: venueId });
      if (result.deletedCount === 0) {
        throw new NotFoundException('Venue not found');
      }
    } else {
      await this.update(venueId, { isActive: false });
    }
  }

  /**
   * Search venues by name or city
   */
  async search(searchTerm: string): Promise<VenueResponse[]> {
    const venues = await this.venueModel.find({
      $or: [
        { name: new RegExp(searchTerm, 'i') },
        { city: new RegExp(searchTerm, 'i') },
      ],
      isActive: true,
    }).lean();

    return venues.map(venue => this.mapVenueToResponse(venue));
  }

  /**
   * Get venue statistics
   */
  async getVenueStats(venueId: string): Promise<VenueStatsResponse> {
    const venue = await this.findById(venueId);
    
    const sectionStats = venue.sections.map(section => ({
      sectionId: section.sectionId,
      name: section.name,
      totalSeats: section.seats.length,
      accessibleSeats: section.seats.filter(s => s.isAccessible).length,
      aisleSeats: section.seats.filter(s => s.isAisle).length,
    }));

    return {
      venueId: venue._id,
      venueName: venue.name,
      totalCapacity: venue.totalCapacity || 0,
      totalSections: venue.sections.length,
      sectionStats,
    };
  }

  /**
   * Helper: Map venue document to response
   */
  private mapVenueToResponse(venue: any): VenueResponse {
    return {
      _id: venue._id.toString(),
      name: venue.name,
      city: venue.city,
      address: venue.address,
      sections: venue.sections,
      mapDimensions: venue.mapDimensions,
      stagePosition: venue.stagePosition,
      isActive: venue.isActive,
      totalCapacity: venue.totalCapacity,
      metadata: venue.metadata,
    };
  }
}