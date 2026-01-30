import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SeatsService } from './event-seats.service';
import { VenueService } from '../venue/venue.service';
import { EventsService } from '../events/events.service';

@Controller('seats')
export class SeatsController {
  constructor(
    private seatsService: SeatsService,
    private venueService: VenueService,
    private eventsService: EventsService,
  ) {}

  /**
   * GET /seats/event/:eventId
   * Get all seats and their statuses for an event
   */
  @Get('event/:eventId')
  async getEventSeats(@Param('eventId') eventId: string) {
    try {
      const seats = await this.seatsService.getEventSeats(eventId);
      const availability =
        await this.seatsService.getAvailableSeatsByZone(eventId);

      return {
        seats,
        availability,
        totalSeats: seats.length,
        availableSeats: Object.values(availability).reduce((a, b) => a + b, 0),
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch event seats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /seats/event/:eventId/zone/:zoneId
   * Get seats for a specific zone
   */

  @Get('event/:eventId/zone/:zoneId')
  async getZoneSeats(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
  ) {
    try {
      const seats = await this.seatsService.getSeatsByZone(eventId, zoneId);
      const available = seats.filter((s) => s.status === 'AVAILABLE').length;
      const held = seats.filter((s) => s.status === 'HELD').length;
      const sold = seats.filter((s) => s.status === 'SOLD').length;

      return {
        seats,
        totalSeats: seats.length,
        availableSeats: available,
        heldSeats: held,
        soldSeats: sold,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch zone seats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /seats/:seatId
   * Get single seat details
   */
  @Get(':seatId')
  async getSeatById(@Param('seatId') seatId: string) {
    try {
      const seat = await this.seatsService.getSeatById(seatId);

      if (!seat) {
        throw new HttpException('Seat not found', HttpStatus.NOT_FOUND);
      }

      return seat;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch seat',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /seats/hold
   * Hold seats temporarily during checkout
   */
  @Post('hold')
  async holdSeats(
    @Body()
    body: {
      eventId: string;
      seatIds: string[];
      customerId: string;
    },
  ) {
    try {
      const result = await this.seatsService.holdSeats({
        eventId: body.eventId,
        seatIds: body.seatIds,
        customerId: body.customerId,
      });

      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to hold seats',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /seats/lock-seat
   * Atomic lock for a single seat as per new requirements
   */
  @Post('lock-seat')
  async lockSeat(@Body() body: { eventSeatId: string; userId: string }) {
    try {
      const result = await this.seatsService.lockSeat(
        body.eventSeatId,
        body.userId,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to lock seat',
        error.status || HttpStatus.CONFLICT,
      );
    }
  }

  /**
   * POST /seats/unlock-seat
   * Release a locked seat (for deselection)
   */
  @Post('unlock-seat')
  async unlockSeat(@Body() body: { eventSeatId: string; userId: string }) {
    try {
      const result = await this.seatsService.unlockSeat(
        body.eventSeatId,
        body.userId,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unlock seat',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /seats/release
   * Manually release held seats (user cancels)
   */
  @Post('release')
  async releaseSeats(@Body() body: { eventId: string; seatIds: string[] }) {
    try {
      await this.seatsService.releaseHeldSeats(body.seatIds, body.eventId);

      return {
        success: true,
        message: 'Seats released successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to release seats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /seats/confirm-purchase
   * Confirm purchase after payment (HELD -> SOLD)
   */
  @Post('confirm-purchase')
  async confirmPurchase(
    @Body()
    body: {
      eventId: string;
      seatIds: string[];
      customerId: string;
      holdToken: string;
    },
  ) {
    try {
      // Verify hold token
      const holdData = this.seatsService.verifyHoldToken(body.holdToken);

      // Check token hasn't expired
      if (new Date() > holdData.expiresAt) {
        throw new HttpException(
          'Hold has expired. Please select seats again.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verify customer and seats match
      if (holdData.customerId !== body.customerId) {
        throw new HttpException('Invalid hold token', HttpStatus.UNAUTHORIZED);
      }

      // Confirm the purchase
      const soldSeats = await this.seatsService.confirmPurchase(
        body.seatIds,
        body.eventId,
        body.customerId,
      );

      return {
        success: true,
        message: 'Purchase confirmed',
        seats: soldSeats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to confirm purchase',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /seats/customer/:customerId/holds
   * Get seats currently held by a customer
   */
  @Get('customer/:customerId/holds')
  async getCustomerHolds(
    @Param('customerId') customerId: string,
    @Query('eventId') eventId?: string,
  ) {
    try {
      const heldSeats = await this.seatsService.getCustomerHeldSeats(
        customerId,
        eventId,
      );

      return {
        heldSeats,
        count: heldSeats.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch customer holds',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /seats/initialize
   * Initialize seats for an event (Admin only)
   */
  @Post('initialize')
  async initializeSeats(@Body() body: { eventId: string; venueId: string }) {
    try {
      await this.seatsService.initializeSeatsForEvent(
        body.eventId,
        body.venueId,
      );

      return {
        success: true,
        message: 'Seats initialized successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to initialize seats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /seats/block
   * Block seats (Admin only)
   */
  @Put('block')
  async blockSeats(@Body() body: { eventId: string; seatIds: string[] }) {
    try {
      await this.seatsService.blockSeats(body.seatIds, body.eventId);

      return {
        success: true,
        message: 'Seats blocked successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to block seats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /seats/unblock
   * Unblock seats (Admin only)
   */
  @Put('unblock')
  async unblockSeats(@Body() body: { eventId: string; seatIds: string[] }) {
    try {
      await this.seatsService.unblockSeats(body.seatIds, body.eventId);

      return {
        success: true,
        message: 'Seats unblocked successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unblock seats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
