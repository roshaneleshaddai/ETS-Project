import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';
import { SeatSchema } from './seats.schema';
import { EventSchema } from '../events/events.schema';
import { VenueSchema } from '../venue/venue.schema';
import { ZoneSchema } from '../zones/zones.schema';
import { EventsModule } from '../events/events.module';
import { VenueModule } from '../venue/venue.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Seat', schema: SeatSchema },
      { name: 'Event', schema: EventSchema },
      { name: 'Venue', schema: VenueSchema },
      { name: 'Zone', schema: ZoneSchema },
    ]),
    EventsModule, // For EventGateway
    VenueModule,
  ],
  controllers: [SeatsController],
  providers: [SeatsService],
  exports: [SeatsService],
})
export class SeatsModule {}