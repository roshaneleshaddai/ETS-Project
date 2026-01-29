const mongoose = require('mongoose');

const DB_URI = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB";

// --- Schemas (Simplified for seeding) ---
const VenueSchema = new mongoose.Schema({
  name: String,
  city: String,
  sections: [
    {
      sectionId: String,
      name: String,
      color: String,
      boundary: [{ x: Number, y: Number }],
      seats: [
        {
          row: String,
          seatNumber: Number,
          position: { x: Number, y: Number },
          isAccessible: Boolean,
          isAisle: Boolean
        }
      ]
    }
  ],
  mapDimensions: { width: Number, height: Number },
  stagePosition: { x: Number, y: Number },
  isActive: Boolean,
  totalCapacity: Number
});

const EventSchema = new mongoose.Schema({
  name: String,
  startDateTime: Date,
  endDateTime: Date,
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' }, // Note: Schema calls it venueId
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },   // Support both just in case
  status: String,
  category: String,
  image: String,
  seatHoldTimeout: Number,
  currency: String
}, { timestamps: true });

const ZoneSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  name: String,
  price: Number,
  currency: String
}, { timestamps: true });

const Venue = mongoose.model('Venue', VenueSchema);
const Event = mongoose.model('Event', EventSchema);
const Zone = mongoose.model('Zone', ZoneSchema);

// --- Generator Helpers ---
function generateSeats(rows, cols, startX, startY, gapX, gapY) {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        row: String.fromCharCode(65 + r), // A, B, C...
        seatNumber: c + 1,
        position: { x: startX + c * gapX, y: startY + r * gapY },
        isAccessible: r === 0 && (c === 0 || c === cols - 1),
        isAisle: c === 0 || c === cols - 1 || c === Math.floor(cols / 2)
      });
    }
  }
  return seats;
}

function generateSection(id, name, color, x, y, width, height, rows, cols) {
  return {
    sectionId: id,
    name: name,
    color: color,
    boundary: [
      { x: x - 20, y: y - 20 },
      { x: x + width + 20, y: y - 20 },
      { x: x + width + 20, y: y + height + 20 },
      { x: x - 20, y: y + height + 20 }
    ],
    seats: generateSeats(rows, cols, x, y, width / cols, height / rows)
  };
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.');

    // 1. Wipe relevant collections
    console.log('Cleaning up old data...');
    await Venue.deleteMany({ name: 'Emperors Palace - Centre Court' });
    // Note: We aren't deleting ALL events, just ones linked to this new venue if we could find them, 
    // but without ID it's hard. For now, we just create new data.
    
    // 2. Create Venue
    console.log('Creating Venue...');
    
    // Layout: Center Stage (Top), Stalls (Middle), Wings (Left/Right), Balcony (Bottom)
    const sections = [];
    
    // Stalls (Premium) - Center
    sections.push(generateSection('stalls_front', 'Stalls Front', '#FFD700', 300, 150, 400, 200, 8, 16));
    sections.push(generateSection('stalls_back', 'Stalls Back', '#C0C0C0', 300, 400, 400, 150, 6, 16));
    
    // Wings (Standard)
    sections.push(generateSection('left_wing', 'Left Wing', '#A0A0A0', 50, 200, 200, 300, 10, 8));
    sections.push(generateSection('right_wing', 'Right Wing', '#A0A0A0', 750, 200, 200, 300, 10, 8));

    // Balcony (Budget)
    sections.push(generateSection('balcony', 'Balcony', '#CD7F32', 200, 650, 600, 100, 4, 20));

    const totalCapacity = sections.reduce((acc, sec) => acc + sec.seats.length, 0);

    const venue = await Venue.create({
      name: 'Emperors Palace - Centre Court',
      city: 'Johannesburg',
      sections: sections,
      mapDimensions: { width: 1000, height: 800 },
      stagePosition: { x: 500, y: 50 },
      isActive: true,
      totalCapacity: totalCapacity
    });
    console.log(`Venue created: ${venue.name} (${venue._id}) with ${totalCapacity} seats.`);

    // 3. Create Event
    console.log('Creating Event...');
    const event = await Event.create({
      name: 'Mariah Carey - Live in Concert',
      description: 'The global superstar returns for a one-night special.',
      startDateTime: new Date('2026-12-15T19:00:00'),
      endDateTime: new Date('2026-12-15T22:00:00'),
      venueId: venue._id,
      venue: venue._id, // Backwards compat
      image: 'https://cdn.promodj.com/afs/4b38d335688d085600c6d2e071724d2712:resize:2000x2000:same:b416fc',
      category: 'MUSIC',
      status: 'ON_SALE',
      seatHoldTimeout: 10, // 10 minutes
      currency: 'ZAR',
      likes: 1240,
      dislikes: 12
    });
    console.log(`Event created: ${event.name} (${event._id})`);

    // 4. Create Zones (Pricing)
    console.log('Creating Zones...');
    const zonesToCreate = [
      { eventId: event._id, name: 'Stalls Front', price: 1500, currency: 'ZAR' }, // Maps to stalls_front section name
      { eventId: event._id, name: 'Stalls Back', price: 1200, currency: 'ZAR' },  // Maps to stalls_back
      { eventId: event._id, name: 'Left Wing', price: 850, currency: 'ZAR' },     // Maps to left_wing
      { eventId: event._id, name: 'Right Wing', price: 850, currency: 'ZAR' },    // Maps to right_wing
      { eventId: event._id, name: 'Balcony', price: 500, currency: 'ZAR' }        // Maps to balcony
    ];

    await Zone.insertMany(zonesToCreate);
    console.log('Zones created.');

    console.log('-----------------------------------');
    console.log('SEEDING COMPLETE (SPARSE STATE)');
    console.log('No seats were created in the DB. The frontend should render the map based on the Venue layout.');
    console.log('-----------------------------------');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

seed();
