import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { EventGateway } from '../events/events.gateway';
import { Seat, SeatDocument } from './seats.schema';

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  SOLD = 'SOLD',
  BLOCKED = 'BLOCKED',
}

export interface HoldSeatsDto {
  eventId: string;
  seatIds: string[];
  customerId: string;
}

export interface SeatResponse {
  _id: string;
  eventId: string;
  zoneId: string;
  row: string;
  seatNumber: string;
  status: string;
  holdExpiresAt?: Date;
  heldBy?: string;
  position?: { x: number; y: number };
  isAccessible?: boolean;
  isAisle?: boolean;
}

@Injectable()
export class SeatsService {
  constructor(
    @InjectModel('Seat') private seatModel: Model<SeatDocument>,
    @InjectModel('Event') private eventModel: Model<any>,
    @InjectModel('Venue') private venueModel: Model<any>,
    @InjectModel('Zone') private zoneModel: Model<any>,
    @InjectConnection() private connection: Connection,
    private eventGateway: EventGateway,
  ) {}

  /**
   * Initialize seats for an event based on venue configuration
   */
  async initializeSeatsForEvent(eventId: string, venueId: string): Promise<void> {
    try {
      const venue = await this.venueModel.findById(venueId).lean();
      if (!venue) {
        throw new BadRequestException('Venue not found');
      }

      const zones = await this.zoneModel.find({ eventId: new Types.ObjectId(eventId) }).lean();
      
      const seatsToCreate: any[] = [];

      for (const section of venue.sections) {
        const zone = zones.find(z => z.name === section.name || z.name.includes(section.sectionId));
        
        if (!zone) {
          console.warn(`No zone found for section ${section.sectionId}`);
          continue;
        }

        for (const seatConfig of section.seats) {
          seatsToCreate.push({
            eventId: new Types.ObjectId(eventId),
            zoneId: zone._id,
            row: seatConfig.row,
            seatNumber: seatConfig.seatNumber.toString(),
            status: SeatStatus.AVAILABLE,
            position: seatConfig.position,
            isAccessible: seatConfig.isAccessible || false,
            isAisle: seatConfig.isAisle || false,
          });
        }
      }

      if (seatsToCreate.length > 0) {
        await this.seatModel.insertMany(seatsToCreate);
        console.log(`Initialized ${seatsToCreate.length} seats for event ${eventId}`);
      }
    } catch (error) {
      console.error('Error initializing seats:', error);
      throw error;
    }
  }

  /**
   * Get all seats for an event
   */
  async getEventSeats(eventId: string): Promise<SeatResponse[]> {
    const seats = await this.seatModel.find({ eventId: new Types.ObjectId(eventId) }).lean();
    return seats.map(seat => this.mapSeatToResponse(seat));
  }

  /**
   * Get seats by zone
   */
  async getSeatsByZone(eventId: string, zoneId: string): Promise<SeatResponse[]> {
    const seats = await this.seatModel.find({ 
      eventId: new Types.ObjectId(eventId),
      zoneId: new Types.ObjectId(zoneId)
    }).lean();
    return seats.map(seat => this.mapSeatToResponse(seat));
  }

  /**
   * Get available seat count by zone
   */
  async getAvailableSeatsByZone(eventId: string): Promise<Record<string, number>> {
    const result = await this.seatModel.aggregate([
      {
        $match: {
          eventId: new Types.ObjectId(eventId),
          status: SeatStatus.AVAILABLE,
        },
      },
      {
        $group: {
          _id: '$zoneId',
          count: { $sum: 1 },
        },
      },
    ]);

    const zoneAvailability: Record<string, number> = {};
    result.forEach((item) => {
      zoneAvailability[item._id.toString()] = item.count;
    });

    return zoneAvailability;
  }

  /**
   * Get seat by ID
   */
  async getSeatById(seatId: string): Promise<SeatResponse | null> {
    const seat = await this.seatModel.findById(seatId).lean();
    return seat ? this.mapSeatToResponse(seat) : null;
  }

  /**
   * Hold seats (freeze during checkout)
   */
  async holdSeats(dto: HoldSeatsDto): Promise<{
    success: boolean;
    holdToken: string;
    expiresAt: Date;
    seats: SeatResponse[];
  }> {
    const { eventId, seatIds, customerId } = dto;

    if (!seatIds || seatIds.length === 0) {
      throw new BadRequestException('No seats selected');
    }

    if (seatIds.length > 10) {
      throw new BadRequestException('Cannot hold more than 10 seats at once');
    }

    const event = await this.eventModel.findById(eventId).lean();
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const holdTimeoutMinutes = event.seatHoldTimeout || 10;
    const now = new Date();
    const holdExpiry = new Date(now.getTime() + holdTimeoutMinutes * 60 * 1000);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const result = await this.seatModel.updateMany(
        {
          _id: { $in: seatIds },
          eventId: eventId,
          status: SeatStatus.AVAILABLE,
        },
        {
          $set: {
            status: SeatStatus.HELD,
            holdExpiresAt: holdExpiry,
            heldBy: customerId,
          },
        },
        { session },
      );

      if (result.modifiedCount !== seatIds.length) {
        throw new ConflictException(
          `Only ${result.modifiedCount} of ${seatIds.length} seats are available. Please refresh and try again.`,
        );
      }

      const heldSeats = await this.seatModel.find({
        _id: { $in: seatIds }
      }).session(session).lean();

      await session.commitTransaction();

      const holdToken = this.generateHoldToken(customerId, seatIds, holdExpiry);

      seatIds.forEach((seatId) => {
        this.eventGateway.broadcastSeatStatusChange(eventId, seatId, SeatStatus.HELD);
      });

      return {
        success: true,
        holdToken,
        expiresAt: holdExpiry,
        seats: heldSeats.map(seat => this.mapSeatToResponse(seat)),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release held seats
   */
  async releaseHeldSeats(seatIds: string[], eventId: string): Promise<void> {
    await this.seatModel.updateMany(
      {
        _id: { $in: seatIds },
        eventId: eventId,
        status: SeatStatus.HELD,
      },
      {
        $set: { status: SeatStatus.AVAILABLE },
        $unset: { holdExpiresAt: '', heldBy: '' },
      },
    );

    seatIds.forEach((seatId) => {
      this.eventGateway.broadcastSeatStatusChange(eventId, seatId, SeatStatus.AVAILABLE);
    });
  }

  /**
   * Confirm purchase - convert HELD to SOLD
   */
  async confirmPurchase(
    seatIds: string[],
    eventId: string,
    customerId: string,
  ): Promise<SeatResponse[]> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const seats = await this.seatModel.find({
        _id: { $in: seatIds },
        eventId: eventId,
      }).session(session).lean();

      const invalidSeats = seats.filter(
        (seat) =>
          seat.status !== SeatStatus.HELD ||
          seat.heldBy?.toString() !== customerId ||
          (seat.holdExpiresAt && seat.holdExpiresAt < new Date()),
      );

      if (invalidSeats.length > 0) {
        throw new ConflictException('Some seats are no longer held by you');
      }

      await this.seatModel.updateMany(
        {
          _id: { $in: seatIds },
          eventId: eventId,
        },
        {
          $set: { status: SeatStatus.SOLD },
          $unset: { holdExpiresAt: '', heldBy: '' },
        },
        { session },
      );

      const soldSeats = await this.seatModel.find({
        _id: { $in: seatIds }
      }).session(session).lean();

      await session.commitTransaction();

      seatIds.forEach((seatId) => {
        this.eventGateway.broadcastSeatStatusChange(eventId, seatId, SeatStatus.SOLD);
      });

      return soldSeats.map(seat => this.mapSeatToResponse(seat));
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Background job: Release expired holds
   */
  @Cron('* * * * *')
  async releaseExpiredHolds(): Promise<void> {
    const now = new Date();

    const expiredSeats = await this.seatModel.find({
      status: SeatStatus.HELD,
      holdExpiresAt: { $lt: now },
    }).lean();

    if (expiredSeats.length === 0) {
      return;
    }

    const result = await this.seatModel.updateMany(
      {
        status: SeatStatus.HELD,
        holdExpiresAt: { $lt: now },
      },
      {
        $set: { status: SeatStatus.AVAILABLE },
        $unset: { holdExpiresAt: '', heldBy: '' },
      },
    );

    console.log(`Released ${result.modifiedCount} expired seat holds`);

    expiredSeats.forEach((seat) => {
      this.eventGateway.broadcastSeatStatusChange(
        seat.eventId.toString(),
        seat._id.toString(),
        SeatStatus.AVAILABLE,
      );
    });
  }

  /**
   * Admin: Block/Unblock seats
   */
  async blockSeats(seatIds: string[], eventId: string): Promise<void> {
    await this.seatModel.updateMany(
      {
        _id: { $in: seatIds },
        eventId: eventId,
        status: SeatStatus.AVAILABLE,
      },
      {
        $set: { status: SeatStatus.BLOCKED },
      },
    );

    seatIds.forEach((seatId) => {
      this.eventGateway.broadcastSeatStatusChange(eventId, seatId, SeatStatus.BLOCKED);
    });
  }

  async unblockSeats(seatIds: string[], eventId: string): Promise<void> {
    await this.seatModel.updateMany(
      {
        _id: { $in: seatIds },
        eventId: eventId,
        status: SeatStatus.BLOCKED,
      },
      {
        $set: { status: SeatStatus.AVAILABLE },
      },
    );

    seatIds.forEach((seatId) => {
      this.eventGateway.broadcastSeatStatusChange(eventId, seatId, SeatStatus.AVAILABLE);
    });
  }

  /**
   * Get seats held by a customer
   */
  async getCustomerHeldSeats(customerId: string, eventId?: string): Promise<SeatResponse[]> {
    const query: any = {
      heldBy: customerId,
      status: SeatStatus.HELD,
    };

    if (eventId) {
      query.eventId = eventId;
    }

    const seats = await this.seatModel.find(query).lean();
    return seats.map(seat => this.mapSeatToResponse(seat));
  }

  /**
   * Helper: Generate hold token
   */
  private generateHoldToken(
    customerId: string,
    seatIds: string[],
    expiresAt: Date,
  ): string {
    const payload = {
      customerId,
      seatIds,
      expiresAt: expiresAt.toISOString(),
      timestamp: Date.now(),
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Helper: Verify hold token
   */
  verifyHoldToken(token: string): {
    customerId: string;
    seatIds: string[];
    expiresAt: Date;
  } {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return {
        customerId: decoded.customerId,
        seatIds: decoded.seatIds,
        expiresAt: new Date(decoded.expiresAt),
      };
    } catch (error) {
      throw new BadRequestException('Invalid hold token');
    }
  }

  /**
   * Helper: Map seat document to response
   */
  private mapSeatToResponse(seat: any): SeatResponse {
    return {
      _id: seat._id.toString(),
      eventId: seat.eventId.toString(),
      zoneId: seat.zoneId.toString(),
      row: seat.row,
      seatNumber: seat.seatNumber,
      status: seat.status,
      holdExpiresAt: seat.holdExpiresAt,
      heldBy: seat.heldBy?.toString(),
      position: seat.position,
      isAccessible: seat.isAccessible,
      isAisle: seat.isAisle,
    };
  }
}