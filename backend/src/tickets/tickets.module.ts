import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket, TicketSchema } from './tickets.schema';

import { Seat, SeatSchema } from '../event-seats/event-seats.schema';
// If you have Zone, Event, Customer modules, import their schemas too or just use 'EventSeat' name check
// Based on error: "Schema hasn't been registered for model 'EventSeat'" which implies populate('seatId') expects a model named 'EventSeat' but Ticket schema ref might be 'EventSeat' while actual model is 'Seat' or vice versa, OR just missing module import.

// Looking at Ticket schema: @Prop({ type: Types.ObjectId, ref: 'EventSeat' }) seatId
// Looking at Seat schema: export class Seat ... @Schema()

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: 'EventSeat', schema: SeatSchema }, // Registering with the name 'EventSeat' to match Ticket schema ref
      // Add others if needed for population
    ]),
  ],
  providers: [TicketsService],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}
