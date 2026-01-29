const mongoose = require('mongoose');

const DB_URI = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB";

async function detailedCheck() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.\n');

    const Venue = mongoose.model('Venue', new mongoose.Schema({}, { strict: false }));

    // Check Default Stadium
    const defaultStadium = await Venue.findById('697b10bb214d6f92962caa02');
    
    console.log('=== DEFAULT STADIUM (697b10bb214d6f92962caa02) ===');
    if (defaultStadium) {
      console.log('Name:', defaultStadium.name);
      console.log('Total Capacity:', defaultStadium.totalCapacity);
      console.log('Sections Count:', defaultStadium.sections?.length || 0);
      
      let totalSeats = 0;
      if (defaultStadium.sections) {
        defaultStadium.sections.forEach((section, idx) => {
          const seatCount = section.seats?.length || 0;
          totalSeats += seatCount;
          console.log(`  Section ${idx + 1}: ${section.name} - ${seatCount} seats`);
        });
      }
      console.log('ACTUAL Total Seats:', totalSeats);
      console.log('Status:', totalSeats > 0 ? '✅ HAS SEATS' : '❌ NO SEATS');
    } else {
      console.log('❌ Not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

detailedCheck();
