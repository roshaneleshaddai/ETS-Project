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
import { VenueService, VenueResponse, VenueStatsResponse } from './venue.service';

interface CreateVenueResponse {
  success: boolean;
  venue: VenueResponse;
}

interface GetVenuesResponse {
  venues: VenueResponse[];
  count: number;
}

interface UpdateVenueResponse {
  success: boolean;
  venue: VenueResponse;
}

interface DeleteVenueResponse {
  success: boolean;
  message: string;
}

@Controller('venue')
export class VenueController {
  constructor(private venueService: VenueService) {}

  /**
   * POST /venue
   */
  @Post()
  async createVenue(@Body() venueData: any): Promise<CreateVenueResponse> {
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
  async getAllVenues(
    @Query('city') city?: string,
    @Query('isActive') isActive?: string,
  ): Promise<GetVenuesResponse> {
    try {
      const filters: any = {};
      
      if (city) {
        filters.city = city;
      }
      
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
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
  async searchVenues(@Query('q') searchTerm: string): Promise<GetVenuesResponse> {
    try {
      if (!searchTerm) {
        throw new HttpException('Search term is required', HttpStatus.BAD_REQUEST);
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
   * GET /venue/:id
   */
  @Get(':id')
  async getVenueById(@Param('id') venueId: string): Promise<VenueResponse> {
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
  async getVenueStats(@Param('id') venueId: string): Promise<VenueStatsResponse> {
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
  async updateVenue(
    @Param('id') venueId: string,
    @Body() updateData: any,
  ): Promise<UpdateVenueResponse> {
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
  async deleteVenue(
    @Param('id') venueId: string,
    @Query('hard') hardDelete?: string,
  ): Promise<DeleteVenueResponse> {
    try {
      const isHardDelete = hardDelete === 'true';
      await this.venueService.delete(venueId, isHardDelete);
      
      return {
        success: true,
        message: isHardDelete ? 'Venue deleted' : 'Venue deactivated',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete venue',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}