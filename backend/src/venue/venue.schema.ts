import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Coordinate system for seat positioning on the visual map
@Schema({ _id: false })
class Coordinate {
  @Prop({ required: true }) x: number;
  @Prop({ required: true }) y: number;
}

// Individual seat configuration in the map
@Schema({ _id: false })
class SeatMapConfig {
  @Prop({ required: true }) row: string; // e.g., "A", "B", "H"
  @Prop({ required: true }) seatNumber: number; // e.g., 1, 2, 46
  @Prop({ type: Coordinate, required: true }) position: Coordinate; // x, y coordinates for rendering
  @Prop() isAccessible?: boolean; // wheelchair accessible
  @Prop() isAisle?: boolean; // next to aisle
}

// Zone/Section configuration in the venue
@Schema({ _id: false })
class VenueSection {
  @Prop({ required: true }) sectionId: string; // "A", "B", "C", "D"
  @Prop({ required: true }) name: string; // "Section A", "Section B"
  @Prop({ required: true }) color: string; // "#9333EA" for purple, "#FF6B6B" for red
  
  // Polygon points defining the section boundary on the map
  @Prop({ type: [Coordinate], required: true }) boundary: Coordinate[];
  
  // Seat configuration for this section
  @Prop({ type: [SeatMapConfig] }) seats: SeatMapConfig[];
  
  // Default pricing category (can be overridden per event)
  @Prop() defaultPriceCategory?: string;
}

// Venue document
export type VenueDocument = Venue & Document;

@Schema({ timestamps: true })
export class Venue {
  @Prop({ required: true, unique: true }) 
  name: string; // "Theatre of Marcellus, Emperors Palace"

  @Prop({ required: true }) 
  city: string;

  @Prop() 
  address?: string;

  @Prop({ type: [VenueSection], required: true })
  sections: VenueSection[];

  // Overall map dimensions for consistent rendering
  @Prop({ type: { width: Number, height: Number }, required: true })
  mapDimensions: { width: number; height: number };

  // Stage/focal point position
  @Prop({ type: Coordinate })
  stagePosition?: Coordinate;

  @Prop({ default: true })
  isActive: boolean;

  // Total capacity across all sections
  @Prop()
  totalCapacity?: number;

  // Venue-specific metadata
  @Prop({ type: Object })
  metadata?: {
    hasParking?: boolean;
    facilities?: string[];
    images?: string[];
  };
}

export const VenueSchema = SchemaFactory.createForClass(Venue);

// Create compound index for efficient queries
VenueSchema.index({ name: 1, city: 1 });
VenueSchema.index({ isActive: 1 });