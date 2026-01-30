import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { EventGateway } from '../events/events.gateway';
import { Seat, SeatDocument, SeatStatus } from './event-seats.schema';

export interface HoldSeatsDto {
  eventId: string;
  seatIds: string[];
  customerId: string;
}

export interface SeatResponse {
  _id: string;
  eventId: string;
  zoneId: string;
  sectionId?: string;
  row: string;
  seatNumber: string;
  status: string;
  holdExpiresAt?: Date;
  heldBy?: string;
  lockedBy?: string;
  price?: number;
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
    @InjectModel('Ticket') private ticketModel: Model<any>,
    @InjectConnection() private connection: Connection,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private eventGateway: EventGateway,
  ) {}

  /**
   * Initialize seats for an event based on venue configuration
   */
  async initializeSeatsForEvent(
    eventId: string,
    venueId: string,
  ): Promise<void> {
    try {
      const venue = await this.venueModel.findById(venueId).lean();
      if (!venue) {
        throw new BadRequestException('Venue not found');
      }

      // In the optimized "Sparse State" architecture, we don't create AVAILABLE seats in MongoDB.
      // We only store seats that are SOLD or PERMANENTLY BLOCKED.
      console.log(
        `Initialized Sparse State for event ${eventId} at venue ${venue.name}`,
      );
    } catch (error) {
      console.error('Error initializing seats:', error);
      throw error;
    }
  }

  /**
   * Get all seats for an event
   */
  async getEventSeats(eventId: string): Promise<SeatResponse[]> {
    try {
      const event = await this.eventModel.findById(eventId).lean();
      if (!event) throw new BadRequestException('Event not found');

      const venue = await this.venueModel
        .findById(event.venue || event.venueId)
        .lean();
      if (!venue) throw new BadRequestException('Venue not found');
      if (!venue.sections || !Array.isArray(venue.sections)) {
        console.warn(`Venue ${venue._id} has no valid sections array`);
        return [];
      }

      const persistentSeats = await this.seatModel
        .find({ eventId: new Types.ObjectId(eventId) })
        .lean();

      const allSeats: SeatResponse[] = [];

      // Treat sections as zones
      for (
        let sectionIndex = 0;
        sectionIndex < venue.sections.length;
        sectionIndex++
      ) {
        const section = venue.sections[sectionIndex];
        const secId = section.sectionId || section.id;

        // Get price for this zone from event zonePricing
        const zoneKey = `z${sectionIndex + 1}`;
        const price = event.zonePricing?.[zoneKey] || 0;

        // const price = event.zonePricing?.[zoneKey] || 0;

        if (!section.seats || !Array.isArray(section.seats)) {
          console.log(`  ⚠️ Section ${secId} has no seats array`);
          continue;
        }

        const seatUids = section.seats.map(
          (s: any) => `${secId}:${s.row}:${s.num || s.number || s.seatNumber}`,
        );
        const redisKeys = seatUids.map(
          (uid) => `lock:event:${eventId}:seat:${uid}`,
        );
        const locks = await this.redis.mget(...redisKeys);

        // const locks = await this.redis.mget(...redisKeys);

        section.seats.forEach((seatConfig: any, index: number) => {
          const uid = seatUids[index];
          const virtualId = `${eventId}:${uid}`;
          const lockedBy = locks[index];
          const seatNum =
            seatConfig.num || seatConfig.number || seatConfig.seatNumber;
          const persistent = persistentSeats.find(
            (ps) =>
              ps.sectionId === secId &&
              ps.row === seatConfig.row &&
              ps.seatNumber === seatNum.toString(),
          );

          if (persistent) {
            allSeats.push(this.mapSeatToResponse(persistent));
          } else {
            allSeats.push({
              _id: virtualId,
              eventId,
              zoneId: secId, // Use section ID as zone ID
              sectionId: secId,
              row: seatConfig.row,
              seatNumber: seatNum.toString(),
              status: lockedBy ? SeatStatus.LOCKED : SeatStatus.AVAILABLE,
              heldBy: lockedBy || undefined,
              price: price,
              position: seatConfig.position,
              isAccessible: seatConfig.isAccessible,
              isAisle: seatConfig.isAisle,
            });
          }
        });
      }

      return allSeats;
    } catch (err) {
      console.error('❌ ERROR in getEventSeats:', err.message);
      console.error('Stack:', err.stack);
      throw err;
    }
  }

  /**
   * Get seats by zone
   */
  async getSeatsByZone(
    eventId: string,
    zoneId: string,
  ): Promise<SeatResponse[]> {
    const event = await this.eventModel.findById(eventId).lean();
    if (!event) throw new BadRequestException('Event not found');

    const venue = await this.venueModel
      .findById(event.venue || event.venueId)
      .lean();
    if (!venue) throw new BadRequestException('Venue not found');
    if (!venue.sections || !Array.isArray(venue.sections)) {
      console.warn(`Venue ${venue._id} has no valid sections array`);
      return [];
    }

    const zone = await this.zoneModel.findById(zoneId).lean();

    // Find the section that matches this zone
    const section = venue.sections.find(
      (s: any) =>
        s.sectionId === zone.name ||
        s.name === zone.name ||
        s.sectionId === zone.sectionId,
    );
    if (!section) return [];

    // Get Persistent Seats from DB (Sparse: only SOLD/BLOCKED)
    const persistentSeats = await this.seatModel
      .find({
        eventId: new Types.ObjectId(eventId),
        zoneId: new Types.ObjectId(zoneId),
      })
      .lean();

    // Get Redis Locks
    // We use a virtual ID format: eventId:sectionId:row:seatNumber
    const seatUids = section.seats.map(
      (s: any) =>
        `${section.sectionId}:${s.row}:${s.num || s.number || s.seatNumber}`,
    );
    const redisKeys = seatUids.map(
      (uid) => `lock:event:${eventId}:seat:${uid}`,
    );
    const locks = await this.redis.mget(...redisKeys);

    return section.seats.map((seatConfig: any, index: number) => {
      const uid = seatUids[index];
      const virtualId = `${eventId}:${uid}`;
      const lockedBy = locks[index];
      const seatNum =
        seatConfig.num || seatConfig.number || seatConfig.seatNumber;
      const persistent = persistentSeats.find(
        (ps) =>
          ps.row === seatConfig.row && ps.seatNumber === seatNum.toString(),
      );

      if (persistent) {
        return this.mapSeatToResponse(persistent);
      }

      return {
        _id: virtualId,
        eventId,
        zoneId,
        row: seatConfig.row,
        seatNumber: seatNum.toString(),
        status: lockedBy ? SeatStatus.LOCKED : SeatStatus.AVAILABLE,
        heldBy: lockedBy || undefined,
        position: seatConfig.position,
        isAccessible: seatConfig.isAccessible,
        isAisle: seatConfig.isAisle,
      };
    });
  }

  /**
   * Get available seat count by zone
   */
  async getAvailableSeatsByZone(
    eventId: string,
  ): Promise<Record<string, number>> {
    const event = await this.eventModel.findById(eventId).lean();
    if (!event) return {};
    const venue = await this.venueModel
      .findById(event.venue || event.venueId)
      .lean();
    if (!venue) return {};
    if (!venue.sections || !Array.isArray(venue.sections)) {
      console.warn(`Venue ${venue._id} has no valid sections array`);
      return {};
    }

    const zones = await this.zoneModel
      .find({ eventId: new Types.ObjectId(eventId) })
      .lean();
    const persistentSeats = await this.seatModel
      .find({ eventId: new Types.ObjectId(eventId) })
      .lean();

    const zoneAvailability: Record<string, number> = {};
    const allRedisKeys: string[] = [];
    const sectionKeyMaps: Array<{ zId: string; keys: string[] }> = [];

    for (const section of venue.sections) {
      const zone = zones.find(
        (z: any) =>
          z.name === section.name ||
          z.name.includes(section.sectionId) ||
          z.sectionId === section.sectionId,
      );
      if (!zone) continue;

      const zId = zone._id.toString();
      const seatUids = section.seats.map(
        (s: any) =>
          `${section.sectionId}:${s.row}:${s.num || s.number || s.seatNumber}`,
      );
      const redisKeys = seatUids.map(
        (uid) => `lock:event:${eventId}:seat:${uid}`,
      );

      allRedisKeys.push(...redisKeys);
      sectionKeyMaps.push({ zId, keys: redisKeys });

      // Initial count from layout minus persistent occupied
      const persistentInSection = persistentSeats.filter(
        (ps) => ps.sectionId === section.sectionId,
      );
      const occupiedInDB = persistentInSection.filter((ps) =>
        [SeatStatus.SOLD, SeatStatus.BLOCKED].includes(ps.status as any),
      ).length;

      zoneAvailability[zId] =
        (zoneAvailability[zId] || 0) + (section.seats.length - occupiedInDB);
    }

    // Batch fetch all locks
    if (allRedisKeys.length > 0) {
      const allLocks = await this.redis.mget(...allRedisKeys);
      const lockMap = new Map(allRedisKeys.map((key, i) => [key, allLocks[i]]));

      sectionKeyMaps.forEach(({ zId, keys }) => {
        const lockedCount = keys.filter((k) => !!lockMap.get(k)).length;
        zoneAvailability[zId] = Math.max(
          0,
          zoneAvailability[zId] - lockedCount,
        );
      });
    }

    return zoneAvailability;
  }

  /**
   * Get seat by ID
   */
  async getSeatById(seatId: string): Promise<SeatResponse | null> {
    // Check if it's a virtual ID (format: eventId:sectionId:row:seatNumber)
    const virtualParts = this.parseVirtualId(seatId);

    if (virtualParts) {
      // Virtual seat - reconstruct from venue layout
      const { eventId, sectionId, row, seatNumber } = virtualParts;

      const event = await this.eventModel.findById(eventId).lean();
      if (!event) return null;

      const venue = await this.venueModel
        .findById(event.venue || event.venueId)
        .lean();
      if (!venue || !venue.sections) return null;

      const section = venue.sections.find(
        (s: any) => s.sectionId === sectionId,
      );
      if (!section || !section.seats) return null;

      const seatConfig = section.seats.find(
        (s: any) =>
          s.row === row &&
          (s.num || s.number || s.seatNumber || '').toString() === seatNumber,
      );

      if (!seatConfig) return null;

      // Find the zone for this section
      const zones = await this.zoneModel
        .find({ eventId: new Types.ObjectId(eventId) })
        .lean();
      const zone = zones.find(
        (z: any) =>
          z.name === section.name || z.name.includes(section.sectionId),
      );

      if (!zone) return null;

      // Check Redis for lock status
      const redisKey = `lock:event:${eventId}:seat:${sectionId}:${row}:${seatNumber}`;
      const lockedBy = await this.redis.get(redisKey);

      return {
        _id: seatId,
        eventId,
        zoneId: zone._id.toString(),
        row,
        seatNumber,
        status: lockedBy ? SeatStatus.LOCKED : SeatStatus.AVAILABLE,
        heldBy: lockedBy || undefined,
        position: seatConfig.position,
        isAccessible: seatConfig.isAccessible,
        isAisle: seatConfig.isAisle,
      };
    }

    // MongoDB ID - fetch from database
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

    // 1. Validate Ownership in Redis and Prepare Keys
    const redisKeys: string[] = [];
    const seatMetas: any[] = [];

    for (const id of seatIds) {
      const v = this.parseVirtualId(id);
      const uid = v ? `${v.sectionId}:${v.row}:${v.seatNumber}` : id;
      const key = `lock:event:${eventId}:seat:${uid}`;
      redisKeys.push(key);
      seatMetas.push(v);
    }

    const locks = await this.redis.mget(...redisKeys);

    for (let i = 0; i < seatIds.length; i++) {
      if (locks[i] !== customerId) {
        throw new ConflictException(
          `Seat ${seatIds[i]} is no longer locked by you. Please re-select.`,
        );
      }
    }

    // 2. Extend/Convert locks to "HELD" in Redis
    const event = await this.eventModel.findById(eventId).lean();
    const holdTimeoutMinutes = event.seatHoldTimeout || 2;
    const holdExpiry = new Date(Date.now() + holdTimeoutMinutes * 60 * 1000);

    const pipeline = this.redis.pipeline();
    redisKeys.forEach((key) => {
      pipeline.expire(key, holdTimeoutMinutes * 60);
    });
    await pipeline.exec();

    // 3. Prepare response (Stateless Merge)
    const venue = await this.venueModel
      .findById(event.venue || event.venueId)
      .lean();
    if (!venue) throw new BadRequestException('Venue not found');
    if (!venue.sections || !Array.isArray(venue.sections)) {
      throw new BadRequestException('Venue has invalid sections data');
    }

    const zones = await this.zoneModel
      .find({ eventId: new Types.ObjectId(eventId) })
      .lean();

    const seats: SeatResponse[] = [];
    for (let i = 0; i < seatIds.length; i++) {
      const id = seatIds[i];
      const v = seatMetas[i];

      if (v) {
        const section = venue.sections.find(
          (s: any) => s.sectionId === v.sectionId,
        );
        const seatConfig = section?.seats.find(
          (s: any) =>
            s.row === v.row &&
            (s.num || s.number || s.seatNumber || '').toString() ===
              v.seatNumber,
        );
        const zone = zones.find(
          (z: any) =>
            z.name === section?.name || z.name.includes(section?.sectionId),
        );

        seats.push({
          _id: id,
          eventId,
          zoneId: zone?._id.toString() || '',
          row: v.row,
          seatNumber: v.seatNumber,
          status: SeatStatus.HELD,
          heldBy: customerId,
          position: seatConfig?.position,
          isAccessible: seatConfig?.isAccessible,
          isAisle: seatConfig?.isAisle,
        });
      } else {
        // Persistent seat from MongoDB
        const persistent = await this.seatModel.findById(id).lean();
        if (persistent) seats.push(this.mapSeatToResponse(persistent));
      }
    }

    const holdToken = this.generateHoldToken(customerId, seatIds, holdExpiry);

    // Broadcast change
    seatIds.forEach((seatId) => {
      this.eventGateway.broadcastSeatStatusChange(
        eventId,
        seatId,
        SeatStatus.HELD,
      );
    });

    return {
      success: true,
      holdToken,
      expiresAt: holdExpiry,
      seats,
    };
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
      this.eventGateway.broadcastSeatStatusChange(
        eventId,
        seatId,
        SeatStatus.AVAILABLE,
      );
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
      const eventObjectId = new Types.ObjectId(eventId);
      const event = await this.eventModel.findById(eventId).lean();
      const venue = await this.venueModel
        .findById(event.venue || event.venueId)
        .lean();
      if (!venue) throw new ConflictException('Venue not found');
      if (!venue.sections || !Array.isArray(venue.sections)) {
        throw new ConflictException('Venue has invalid sections data');
      }
      const zones = await this.zoneModel
        .find({ eventId: eventObjectId })
        .lean();

      // 1. Final Redis Validation
      const redisKeys: string[] = [];
      const seatMetas: any[] = [];
      for (const id of seatIds) {
        const v = this.parseVirtualId(id);
        const uid = v ? `${v.sectionId}:${v.row}:${v.seatNumber}` : id;
        redisKeys.push(`lock:event:${eventId}:seat:${uid}`);

        if (v) {
          const section = venue.sections.find(
            (s: any) => s.sectionId === v.sectionId,
          );
          const zone = zones.find(
            (z: any) =>
              z.name === section?.name || z.name.includes(section?.sectionId),
          );
          const seatConfig = section?.seats.find(
            (s: any) =>
              s.row === v.row &&
              (s.num || s.number || s.seatNumber || '').toString() ===
                v.seatNumber,
          );

          seatMetas.push({
            ...v,
            zoneId: zone?._id,
            position: seatConfig?.position,
            isAccessible: seatConfig?.isAccessible,
            isAisle: seatConfig?.isAisle,
          });
        } else {
          const s = await this.seatModel.findById(id).lean();
          if (s) {
            seatMetas.push({
              sectionId: s.sectionId,
              row: s.row,
              seatNumber: s.seatNumber,
              zoneId: s.zoneId,
              position: s.position,
              isAccessible: s.isAccessible,
              isAisle: s.isAisle,
            });
          }
        }
      }

      const locks = await this.redis.mget(...redisKeys);
      for (let i = 0; i < seatIds.length; i++) {
        if (locks[i] !== customerId) {
          throw new ConflictException(
            `Hold for seat ${seatIds[i]} has expired. Purchase failed.`,
          );
        }
      }

      // 2. Atomic MongoDB Sparse Creation (SOLD)
      const soldSeats: any[] = [];
      for (const meta of seatMetas) {
        const seat = await this.seatModel.findOneAndUpdate(
          {
            eventId: eventObjectId,
            sectionId: meta.sectionId,
            row: meta.row,
            seatNumber: meta.seatNumber,
          },
          {
            $set: {
              status: SeatStatus.SOLD,
              zoneId: meta.zoneId,
              position: meta.position,
              isAccessible: meta.isAccessible,
              isAisle: meta.isAisle,
              heldBy: null,
              holdExpiresAt: null,
            },
          },
          { upsert: true, new: true, session },
        );
        if (seat) soldSeats.push(seat);
      }

      // 3. Clear Redis Locks
      await this.redis.del(...redisKeys);

      // Create Tickets for each sold seat
      // Fetch zone prices for the logic below
      const zoneIds = [
        ...new Set(soldSeats.map((s) => s.zoneId?.toString()).filter(Boolean)),
      ];
      const activeZones = await this.zoneModel
        .find({ _id: { $in: zoneIds.map((id) => new Types.ObjectId(id)) } })
        .session(session)
        .lean();

      const ticketsToCreate = soldSeats.map((seat) => {
        const zone = activeZones.find(
          (z) => z._id.toString() === seat.zoneId?.toString(),
        );
        return {
          ticketCode: `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          eventId: seat.eventId,
          customerId: new Types.ObjectId(customerId),
          seatId: seat._id,
          zoneId: seat.zoneId,
          pricePaid: zone?.price || 0,
          status: 'VALID',
          discountApplied: 0,
        };
      });

      await this.ticketModel.insertMany(ticketsToCreate, { session });

      await session.commitTransaction();

      seatIds.forEach((seatId) => {
        this.eventGateway.broadcastSeatStatusChange(
          eventId,
          seatId,
          SeatStatus.SOLD,
        );
      });

      return soldSeats.map((seat) => this.mapSeatToResponse(seat));
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Lock a single seat temporarily
   * Part of the "Process Flow" in User Request Section 2
   */
  async lockSeat(
    eventSeatId: string,
    userId: string,
  ): Promise<{ success: boolean; expiresAt: Date }> {
    let eventId: string;
    let seatUid: string;

    const virtualInfo = this.parseVirtualId(eventSeatId);
    if (virtualInfo) {
      eventId = virtualInfo.eventId;
      seatUid = `${virtualInfo.sectionId}:${virtualInfo.row}:${virtualInfo.seatNumber}`;

      // 1. Permanent State Check (SQL/MongoDB)
      const persistent = await this.seatModel
        .findOne({
          eventId: new Types.ObjectId(eventId),
          sectionId: virtualInfo.sectionId,
          row: virtualInfo.row,
          seatNumber: virtualInfo.seatNumber,
        })
        .lean();

      if (
        persistent &&
        [SeatStatus.SOLD, SeatStatus.BLOCKED].includes(persistent.status)
      ) {
        throw new ConflictException('Seat is no longer available');
      }
    } else {
      // It's a MongoDB ID (legacy or persistent)
      const seat = await this.seatModel.findById(eventSeatId).lean();
      if (!seat) throw new BadRequestException('Seat not found');
      if ([SeatStatus.SOLD, SeatStatus.BLOCKED].includes(seat.status)) {
        throw new ConflictException('Seat is no longer available');
      }
      eventId = seat.eventId.toString();
      seatUid = `${seat.sectionId}:${seat.row}:${seat.seatNumber}`;
    }

    const redisKey = `lock:event:${eventId}:seat:${seatUid}`;

    // 2. Atomic Lock via Redis Lua Script
    const luaScript = `
      local lockExists = redis.call("EXISTS", KEYS[1])
      if lockExists == 0 then
        redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
        return 1
      else
        local currentLock = redis.call("GET", KEYS[1])
        if currentLock == ARGV[1] then
          redis.call("EXPIRE", KEYS[1], ARGV[2])
          return 1
        end
        return 0
      end
    `;

    const event = await this.eventModel.findById(eventId).lean();
    const holdTimeoutMinutes = (event as any)?.seatHoldTimeout || 2;
    const ttlSeconds = holdTimeoutMinutes * 60;

    const result = await this.redis.eval(
      luaScript,
      1,
      redisKey,
      userId,
      ttlSeconds,
    );

    if (result !== 1) {
      throw new ConflictException('Seat is already locked by another user');
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Broadcast change
    this.eventGateway.broadcastSeatStatusChange(
      eventId,
      eventSeatId,
      SeatStatus.LOCKED,
    );

    return {
      success: true,
      expiresAt,
    };
  }

  /**
   * Unlock a seat (release Redis lock)
   */
  async unlockSeat(
    eventSeatId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    let eventId: string;
    let seatUid: string;

    // Parse virtual or MongoDB ID
    const v = this.parseVirtualId(eventSeatId);
    if (v) {
      eventId = v.eventId;
      seatUid = `${v.sectionId}:${v.row}:${v.seatNumber}`;
    } else {
      const seat = await this.seatModel.findById(eventSeatId).lean();
      if (!seat) throw new BadRequestException('Seat not found');
      eventId = seat.eventId.toString();
      seatUid = `${seat.sectionId}:${seat.row}:${seat.seatNumber}`;
    }

    const redisKey = `lock:event:${eventId}:seat:${seatUid}`;

    // Only delete the lock if it belongs to this user
    const luaScript = `
      local currentLock = redis.call("GET", KEYS[1])
      if currentLock == ARGV[1] then
        redis.call("DEL", KEYS[1])
        return 1
      end
      return 0
    `;

    const result = await this.redis.eval(luaScript, 1, redisKey, userId);

    if (result === 1) {
      // Broadcast that seat is now available
      this.eventGateway.broadcastSeatStatusChange(
        eventId,
        eventSeatId,
        SeatStatus.AVAILABLE,
      );
      return { success: true };
    }

    // Lock didn't belong to user or didn't exist
    return { success: false };
  }

  private parseVirtualId(eventSeatId: string) {
    if (!eventSeatId || !eventSeatId.includes(':')) return null;
    const parts = eventSeatId.split(':');
    if (parts.length < 4) return null;
    return {
      eventId: parts[0],
      sectionId: parts[1],
      row: parts[2],
      seatNumber: parts[3],
    };
  }

  @Cron('* * * * *')
  async handleExpiredLocks(): Promise<void> {
    const now = new Date();

    // Redis handles LOCKED TTL automatically.
    // We only need to clean up HELD status for seats that reached checkout but weren't bought.
    const legacyExpiredSeats = await this.seatModel
      .find({
        status: SeatStatus.HELD,
        holdExpiresAt: { $lt: now },
      })
      .lean();

    if (legacyExpiredSeats.length > 0) {
      const result = await this.seatModel.updateMany(
        { status: SeatStatus.HELD, holdExpiresAt: { $lt: now } },
        {
          $set: { status: SeatStatus.AVAILABLE },
          $unset: { holdExpiresAt: '', heldBy: '' },
        },
      );

      console.log(
        `Cleanup: Released ${result.modifiedCount} expired seat holds (HELD)`,
      );

      legacyExpiredSeats.forEach((seat) => {
        this.eventGateway.broadcastSeatStatusChange(
          seat.eventId.toString(),
          seat._id.toString(),
          SeatStatus.AVAILABLE,
        );
      });
    }
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
      this.eventGateway.broadcastSeatStatusChange(
        eventId,
        seatId,
        SeatStatus.BLOCKED,
      );
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
      this.eventGateway.broadcastSeatStatusChange(
        eventId,
        seatId,
        SeatStatus.AVAILABLE,
      );
    });
  }

  /**
   * Get seats held by a customer
   */
  async getCustomerHeldSeats(
    customerId: string,
    eventId?: string,
  ): Promise<SeatResponse[]> {
    const query: any = {
      heldBy: customerId,
      status: SeatStatus.HELD,
    };

    if (eventId) {
      query.eventId = eventId;
    }

    const seats = await this.seatModel.find(query).lean();
    return seats.map((seat) => this.mapSeatToResponse(seat));
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
      sectionId: seat.sectionId,
      row: seat.row,
      seatNumber: seat.seatNumber,
      status: seat.status,
      holdExpiresAt: seat.holdExpiresAt,
      heldBy: seat.heldBy?.toString(),
      lockedBy: seat.lockedBy,
      price: seat.price,
      position: seat.position,
      isAccessible: seat.isAccessible,
      isAisle: seat.isAisle,
    };
  }
}
