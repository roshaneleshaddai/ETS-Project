import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { EventGateway } from '../events/events.gateway';
import { Seat, SeatDocument, SeatStatus } from './event-seats.schema';
import { Event } from '../events/events.schema';
import { Venue } from '../venue/venue.schema';
import { Ticket } from '../tickets/tickets.schema';

export interface SeatResponse {
  _id: string;
  eventId: string;
  sectionId?: string;
  row: string;
  seatNumber: string;
  status: string;
  price?: number;
  zoneName?: string; // Added zoneName
  position?: { x: number; y: number };
  isAccessible?: boolean;
  lockedBy?: string;
  heldBy?: string;
}

@Injectable()
export class EventSeatsService {
  constructor(
    @InjectModel(Seat.name) private seatModel: Model<SeatDocument>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(Venue.name) private venueModel: Model<Venue>,
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectConnection() private connection: Connection,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private eventGateway: EventGateway,
  ) {}

  /**
   * CORE: Get all seats (Merges Virtual Inventory + Redis Locks + MongoDB Sales)
   */
  async getEventSeats(eventId: string): Promise<SeatResponse[]> {
    // 1. Fetch Event & Venue
    // 1. Fetch Event & Venue
    const event = await this.eventModel.findById(eventId).lean();
    if (!event) throw new NotFoundException('Event not found');

    const venue = await this.venueModel.findById(event.venueId).lean();
    if (!venue) throw new NotFoundException('Venue not found');

    // 2. Fetch Persistent State (Sold/Blocked seats only)
    const persistentSeats = await this.seatModel
      .find({ eventId: new Types.ObjectId(eventId) })
      .lean();

    // Create a Map for O(1) lookup of persistent seats
    // Key format: "sectionId:row:number"
    const persistentMap = new Map();
    persistentSeats.forEach((ps) => {
      persistentMap.set(`${ps.sectionId}:${ps.row}:${ps.seatNumber}`, ps);
    });

    const allSeats: SeatResponse[] = [];
    const redisKeys: string[] = [];
    const seatMetaList: any[] = [];

    // 3. Iterate Venue Layout to build "Virtual" Inventory
    if (venue.sections) {
      for (const section of venue.sections) {
        // MATCHING LOGIC: Find Event Zone matching Section Name
        // If exact match not found, fallback to first zone or 0 price
        const zones = event.zones || [];
        const matchedZone =
          zones.find((z) => z.name === section.name) || zones[0];
        const price = matchedZone ? matchedZone.price : 0;
        const zoneName = matchedZone ? matchedZone.name : 'Standard';

        if (section.seats) {
          section.seats.forEach((vs: any, idx) => {
            const seatNum =
              vs.number != null
                ? vs.number
                : vs.seatNumber != null
                  ? vs.seatNumber
                  : vs.num != null
                    ? vs.num
                    : `idx-${idx}`;

            const uid = `${section.id}:${vs.row}:${seatNum}`;

            // Check if exists in DB (Sold/Blocked)
            const persistent = persistentMap.get(uid);

            if (persistent) {
              allSeats.push(this.mapSeatToResponse(persistent));
            } else {
              // It's technically available, but check Redis for temporary locks
              const virtualId = `${eventId}:${uid}`; // ID used by Frontend
              const redisKey = `lock:event:${eventId}:${uid}`;

              redisKeys.push(redisKey);
              seatMetaList.push({
                _id: virtualId,
                eventId,
                sectionId: section.id,
                row: vs.row,
                seatNumber: seatNum.toString(),
                price,
                zoneName,
                position: { x: vs.x, y: vs.y },
                isAccessible: (vs as any).type === 'ACCESSIBLE', // Handle enum or boolean
              });
            }
          });
        }
      }
    }

    // 4. Batch Check Redis Locks
    if (redisKeys.length > 0) {
      const locks = await this.redis.mget(...redisKeys);

      seatMetaList.forEach((meta, index) => {
        const lockedByUser = locks[index];

        allSeats.push({
          ...meta,
          status: lockedByUser ? SeatStatus.LOCKED : SeatStatus.AVAILABLE,
          lockedBy: lockedByUser || undefined,
        });
      });
    }

    return allSeats;
  }

  /**
   * Lock a single seat (User taps a seat)
   */
  async lockSeat(eventSeatId: string, userId: string) {
    let eventId: string;
    let uid: string;

    if (eventSeatId.includes(':')) {
      // Virtual ID
      const parts = eventSeatId.split(':');
      eventId = parts[0];
      uid = parts.slice(1).join(':');
    } else {
      // Persistent Mongo ID
      const seat = await this.seatModel.findById(eventSeatId).lean();
      if (!seat) throw new NotFoundException('Seat not found');
      eventId = seat.eventId.toString();
      uid = `${seat.sectionId}:${seat.row}:${seat.seatNumber}`;

      if (seat.status !== SeatStatus.AVAILABLE) {
        throw new ConflictException('Seat is unavailable');
      }
    }

    // 1. Check DB for Hard status (SOLD/BLOCKED) if we derived from Virtual ID
    // or simply re-verify.
    // We break the uid "section:row:num" to query DB
    const [sectionId, row, num] = uid.split(':');

    const persistent = await this.seatModel.findOne({
      eventId: new Types.ObjectId(eventId),
      sectionId,
      row,
      seatNumber: num,
    });

    if (persistent && persistent.status !== SeatStatus.AVAILABLE) {
      throw new ConflictException('Seat is unavailable');
    }

    // 2. Redis Atomic Lock
    const redisKey = `lock:event:${eventId}:${uid}`;
    const ttlSeconds = 600; // 10 minutes

    const luaScript = `
      local current = redis.call("GET", KEYS[1])
      if not current or current == ARGV[1] then
        redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      redisKey,
      userId,
      ttlSeconds,
    );

    if (result !== 1) {
      throw new ConflictException('Seat is locked by another user');
    }

    // 3. Broadcast
    this.eventGateway.broadcastSeatStatusChange(
      eventId,
      eventSeatId,
      SeatStatus.LOCKED,
    );

    return {
      success: true,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  /**
   * Unlock a seat
   */
  async unlockSeat(eventSeatId: string, userId: string) {
    let eventId: string;
    let uid: string;

    if (eventSeatId.includes(':')) {
      const parts = eventSeatId.split(':');
      eventId = parts[0];
      uid = parts.slice(1).join(':');
    } else {
      const seat = await this.seatModel.findById(eventSeatId).lean();
      if (!seat) throw new NotFoundException('Seat not found');
      eventId = seat.eventId.toString();
      uid = `${seat.sectionId}:${seat.row}:${seat.seatNumber}`;
    }

    const redisKey = `lock:event:${eventId}:${uid}`;

    const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    await this.redis.eval(luaScript, 1, redisKey, userId);

    this.eventGateway.broadcastSeatStatusChange(
      eventId,
      eventSeatId,
      SeatStatus.AVAILABLE,
    );
    return { success: true };
  }

  /**
   * Confirm Purchase (Moves from Redis Lock -> MongoDB Sold Document)
   */
  async confirmPurchase(eventSeatIds: string[], userId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const soldSeats: any[] = [];
      const redisKeysToDelete: string[] = [];

      const orderId = new Types.ObjectId(); // Generate a new Order ID for this transaction

      for (const fullId of eventSeatIds) {
        let eventId, uid;
        if (fullId.includes(':')) {
          const parts = fullId.split(':');
          eventId = parts[0];
          uid = parts.slice(1).join(':');
        } else {
          const existingSeat = await this.seatModel.findById(fullId).lean();
          if (!existingSeat)
            throw new NotFoundException(`Seat ${fullId} not found`);
          eventId = existingSeat.eventId.toString();
          uid = `${existingSeat.sectionId}:${existingSeat.row}:${existingSeat.seatNumber}`;
        }

        const [sectionId, row, num] = uid.split(':');

        // Double Check Redis Lock
        const redisKey = `lock:event:${eventId}:${uid}`;
        const lockOwner = await this.redis.get(redisKey);

        if (lockOwner !== userId) {
          throw new ConflictException(`Lock expired for seat ${row}-${num}`);
        }

        // Create Persistent "SOLD" Record
        const seat = await this.seatModel.findOneAndUpdate(
          {
            eventId: new Types.ObjectId(eventId),
            sectionId,
            row,
            seatNumber: num, // ensure string/number match schema
          },
          {
            status: SeatStatus.SOLD,
            lockedBy: null,
          },
          { upsert: true, new: true, session },
        );

        soldSeats.push(seat);
        redisKeysToDelete.push(redisKey);

        // --- CREATE TICKET ---
        // Note: Title is not in schema, removing it.
        const ticketCode = new Types.ObjectId().toString(); // Use unique ID for ticketCode as well
        const ticket = new this.ticketModel({
          qrCode: ticketCode,
          ticketCode: ticketCode,
          orderId: orderId,
          customerId: new Types.ObjectId(userId),
          eventId: new Types.ObjectId(eventId),
          seatId: seat._id,
          pricePaid: (seat as any).price || 0,
          status: 'VALID',
        });
        await ticket.save({ session });
      }

      await session.commitTransaction();

      // Cleanup Redis
      if (redisKeysToDelete.length) await this.redis.del(...redisKeysToDelete);

      return soldSeats;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  // --- Helpers ---

  /**
   * Parses either a virtual ID "eventId:sec:row:num" or resolves a Mongo ID
   */
  private parseSeatId(id: string): { eventId: string; uid: string } {
    if (id.includes(':')) {
      // It's a virtual ID: "eventId:sectionId:row:num"
      const parts = id.split(':');
      const eventId = parts[0];
      const uid = parts.slice(1).join(':'); // "sectionId:row:num"
      return { eventId, uid };
    }
    // If it were a MongoID, you'd need to look it up.
    // But since you are using Sparse state, the UI should primarily use the virtual string
    // or the mongo object ID. For simplicity, assume UI sends virtual ID for locks.
    throw new BadRequestException('Invalid Seat ID format');
  }

  private mapSeatToResponse(seat: any): SeatResponse {
    return {
      _id: seat._id.toString(), // Persistent ID
      eventId: seat.eventId.toString(),
      sectionId: seat.sectionId,
      row: seat.row,
      seatNumber: seat.seatNumber,
      status: seat.status,
      price: seat.price || 0, // Store price in DB if needed upon sale
      lockedBy: seat.lockedBy,
      heldBy: seat.heldBy,
    };
  }

  @Cron('*/5 * * * *')
  async cleanupStaleLocks() {
    // Redis handles expiration automatically via TTL.
    // This is just a placeholder if you implement specific DB cleanup.
  }
}
