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

async function fixSeats() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.');

    // Find the venue
    const venueId = '697b10bb214d6f92962caa02';
    
    // Generate seats
    const rows = 20;
    const cols = 30;
    const startX = 120;
    const startY = 120;
    const width = 560;
    const height = 360;
    const gapX = width / (cols - 1);
    const gapY = height / (rows - 1);
    const seats = generateSeats(rows, cols, startX, startY, gapX, gapY);

    console.log(`Generated ${seats.length} seats`);

    // Use updateOne with $set to update the nested seats array
    const result = await mongoose.connection.db.collection('venues').updateOne(
      { _id: new mongoose.Types.ObjectId(venueId) },
      { 
        $set: { 
          'sections.0.seats': seats,
          'totalCapacity': seats.length
        } 
      }
    );

    console.log('Update result:', result.modifiedCount > 0 ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Modified count:', result.modifiedCount);
    console.log('Matched count:', result.matchedCount);

    // Verify
    const venue = await mongoose.connection.db.collection('venues').findOne(
      { _id: new mongoose.Types.ObjectId(venueId) }
    );

    if (venue && venue.sections && venue.sections[0]) {
      console.log('\n✅ VERIFICATION:');
      console.log('Section name:', venue.sections[0].name);
      console.log('Seats in section:', venue.sections[0].seats?.length || 0);
      console.log('Total capacity:', venue.totalCapacity);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

fixSeats();
