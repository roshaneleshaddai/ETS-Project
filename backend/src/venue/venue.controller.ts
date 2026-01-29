import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VenueService } from './venue.service';
import { Venue } from './venue.schema';

@Controller('venue')
export class VenueController {
  constructor(private venueService: VenueService) {}

  /**
   * POST /venue
   */
  @Post()
  async createVenue(@Body() venueData: any) {
    try {
      const venue = await this.venueService.create(venueData);
      return {
        success: true,
        venue,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create venue',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * GET /venue
   */
  @Get()
  async getAllVenues(@Query('location') location?: string) {
    try {
      const filters: any = {};

      if (location) {
        filters.location = location;
      }

      const venues = await this.venueService.findAll(filters);

      return {
        venues,
        count: venues.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch venues',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /venue/search
   */
  @Get('search')
  async searchVenues(@Query('q') searchTerm: string) {
    try {
      if (!searchTerm) {
        throw new HttpException(
          'Search term is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const venues = await this.venueService.search(searchTerm);

      return {
        venues,
        count: venues.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to search venues',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /venue/:id - Returns complete venue with zones and seats
   */
  @Get(':id')
  async getVenueById(@Param('id') venueId: string): Promise<Venue> {
    try {
      const venue = await this.venueService.findById(venueId);
      return venue;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch venue',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * GET /venue/:id/stats
   */
  @Get(':id/stats')
  async getVenueStats(@Param('id') venueId: string) {
    try {
      const stats = await this.venueService.getVenueStats(venueId);
      return stats;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch venue stats',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /venue/:id
   */
  @Put(':id')
  async updateVenue(@Param('id') venueId: string, @Body() updateData: any) {
    try {
      const venue = await this.venueService.update(venueId, updateData);

      return {
        success: true,
        venue,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update venue',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /venue/:id
   */
  @Delete(':id')
  async deleteVenue(@Param('id') venueId: string) {
    try {
      await this.venueService.delete(venueId);

      return {
        success: true,
        message: 'Venue deleted',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete venue',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
