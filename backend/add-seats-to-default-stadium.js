const mongoose = require('mongoose');

const DB_URI = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB";

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

async function addSeatsToDefaultStadium() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.');

    const Venue = mongoose.model('Venue', new mongoose.Schema({}, { strict: false }));

    // Find the Default Stadium venue
    const venue = await Venue.findById('697b10bb214d6f92962caa02');
    
    if (!venue) {
      console.error('❌ Default Stadium venue not found.');
      process.exit(1);
    }

    console.log(`Found venue: ${venue.name}`);

    // Generate seats for Section A
    // The boundary is 600x400 (from x:100-700, y:100-500)
    // Let's create a nice grid of seats
    const rows = 20;
    const cols = 30;
    
    const startX = 120; // With some padding from boundary
    const startY = 120;
    const width = 560; // 700 - 100 - 40 (padding)
    const height = 360; // 500 - 100 - 40 (padding)
    
    const gapX = width / (cols - 1);
    const gapY = height / (rows - 1);

    const seats = generateSeats(rows, cols, startX, startY, gapX, gapY);

    console.log(`Generated ${seats.length} seats (${rows} rows × ${cols} cols)`);

    // Update the venue
    venue.sections[0].seats = seats;
    venue.totalCapacity = seats.length;

    await venue.save();

    console.log(`✅ Successfully added ${seats.length} seats to ${venue.name}`);
    console.log(`   Venue ID: ${venue._id}`);
    console.log(`   Section: ${venue.sections[0].name}`);
    console.log(`   Total Capacity: ${venue.totalCapacity}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

addSeatsToDefaultStadium();
