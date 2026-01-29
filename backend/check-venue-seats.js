const mongoose = require('mongoose');

const DB_URI = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB";

async function checkVenue() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.');

    const Venue = mongoose.model('Venue', new mongoose.Schema({}, { strict: false }));

    // Check Default Stadium
    const defaultStadium = await Venue.findById('697b10bb214d6f92962caa02');
    
    if (!defaultStadium) {
      console.error('❌ Default Stadium not found.');
      process.exit(1);
    }

    console.log('\n=== DEFAULT STADIUM ===');
    console.log('Name:', defaultStadium.name);
    console.log('Sections:', defaultStadium.sections?.length || 0);
    
    if (defaultStadium.sections && defaultStadium.sections.length > 0) {
      defaultStadium.sections.forEach((section, idx) => {
        console.log(`\nSection ${idx + 1}:`);
        console.log('  - ID:', section.sectionId);
        console.log('  - Name:', section.name);
        console.log('  - Seats:', section.seats?.length || 0);
        if (section.seats && section.seats.length > 0) {
          console.log('  - First seat:', JSON.stringify(section.seats[0], null, 2));
        }
      });
    }

    // Check Emperors Palace
    console.log('\n=== EMPERORS PALACE ===');
    const emperorsPalace = await Venue.findOne({ name: 'Emperors Palace - Centre Court' });
    
    if (emperorsPalace) {
      console.log('Name:', emperorsPalace.name);
      console.log('Sections:', emperorsPalace.sections?.length || 0);
      
      if (emperorsPalace.sections && emperorsPalace.sections.length > 0) {
        let totalSeats = 0;
        emperorsPalace.sections.forEach((section, idx) => {
          const seatCount = section.seats?.length || 0;
          totalSeats += seatCount;
          console.log(`  Section ${idx + 1} (${section.name}): ${seatCount} seats`);
        });
        console.log('Total seats:', totalSeats);
      }
    } else {
      console.log('❌ Emperors Palace not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkVenue();
