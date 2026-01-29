const mongoose = require('mongoose');

const DB_URI = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB";

async function fixEventVenue() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.');

    // Find the new venue
    const Venue = mongoose.model('Venue', new mongoose.Schema({}, { strict: false }));
    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));

    const newVenue = await Venue.findOne({ name: 'Emperors Palace - Centre Court' });
    if (!newVenue) {
      console.error('❌ New venue not found. Please run seed-sparse-data.js first.');
      process.exit(1);
    }

    console.log(`Found new venue: ${newVenue.name} (${newVenue._id})`);

    // Find the event that needs updating
    const eventId = '6971d366ea5645dcaf823b86';
    const event = await Event.findById(eventId);
    
    if (!event) {
      console.error(`❌ Event ${eventId} not found.`);
      process.exit(1);
    }

    console.log(`Found event: ${event.name}`);
    console.log(`Current venue: ${event.venue || event.venueId}`);

    // Update the event to point to the new venue
    await Event.updateOne(
      { _id: eventId },
      { 
        $set: { 
          venue: newVenue._id,
          venueId: newVenue._id 
        } 
      }
    );

    console.log(`✅ Updated event ${event.name} to use venue ${newVenue.name}`);
    console.log(`   Event ID: ${eventId}`);
    console.log(`   New Venue ID: ${newVenue._id}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

fixEventVenue();
