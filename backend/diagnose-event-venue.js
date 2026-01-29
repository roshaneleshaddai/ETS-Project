const mongoose = require('mongoose');

const DB_URI = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB";

async function checkEventVenue() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.\n');

    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));
    const Venue = mongoose.model('Venue', new mongoose.Schema({}, { strict: false }));

    const eventId = '6971d366ea5645dcaf823b86';
    
    // Find the event
    const event = await Event.findById(eventId);
    
    if (!event) {
      console.log('❌ Event not found');
      process.exit(1);
    }

    console.log('=== EVENT DETAILS ===');
    console.log('Event Name:', event.name);
    console.log('Event ID:', event._id);
    console.log('Venue ID (venue field):', event.venue);
    console.log('Venue ID (venueId field):', event.venueId);

    // Find the venue
    const venueId = event.venue || event.venueId;
    const venue = await Venue.findById(venueId);

    console.log('\n=== VENUE DETAILS ===');
    if (venue) {
      console.log('Venue Name:', venue.name);
      console.log('Venue ID:', venue._id);
      console.log('Sections:', venue.sections?.length || 0);
      
      let totalSeats = 0;
      if (venue.sections) {
        venue.sections.forEach((section, idx) => {
          const seatCount = section.seats?.length || 0;
          totalSeats += seatCount;
          console.log(`  Section ${idx + 1}: ${section.sectionId} - ${section.name} - ${seatCount} seats`);
        });
      }
      console.log('TOTAL SEATS:', totalSeats);
      console.log('Status:', totalSeats > 0 ? '✅ HAS SEATS' : '❌ NO SEATS');
    } else {
      console.log('❌ Venue not found');
    }

    console.log('\n=== RECOMMENDATION ===');
    if (venue && venue.sections && venue.sections[0] && (!venue.sections[0].seats || venue.sections[0].seats.length === 0)) {
      console.log('⚠️  Venue has no seats. The event should use Default Stadium instead.');
      console.log('Run: node use-default-stadium.js');
    } else if (venue && venue.sections && venue.sections.some(s => s.seats && s.seats.length > 0)) {
      console.log('✅ Venue has seats. Backend API should work.');
      console.log('Check backend logs or test API endpoint:');
      console.log(`GET http://localhost:3001/seats/event/${eventId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkEventVenue();
