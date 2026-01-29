import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';
import { Venue, VenueSchema } from './venue.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Venue.name, schema: VenueSchema }]),
  ],
  controllers: [VenueController],
  providers: [VenueService],
  exports: [VenueService],
})
export class VenueModule {}
