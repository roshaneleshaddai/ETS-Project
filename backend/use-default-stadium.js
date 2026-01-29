const mongoose = require('mongoose');

const DB_URI = "mongodb+srv://neerajagurram777_db_user:nVM8v6FYYpUVoQdm@cluster0.ugip8wc.mongodb.net/ETS_DB";

async function useDefaultStadium() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('Connected.');

    const eventId = '6971d366ea5645dcaf823b86';
    const defaultStadiumId = '697b10bb214d6f92962caa02'; // Default Stadium with 600 seats

    // Update event to use Default Stadium
    const result = await mongoose.connection.db.collection('events').updateOne(
      { _id: new mongoose.Types.ObjectId(eventId) },
      { 
        $set: { 
          venue: new mongoose.Types.ObjectId(defaultStadiumId),
          venueId: new mongoose.Types.ObjectId(defaultStadiumId)
        } 
      }
    );

    console.log('\n✅ Event updated to use Default Stadium');
    console.log('Modified count:', result.modifiedCount);

    // Verify
    const event = await mongoose.connection.db.collection('events').findOne(
      { _id: new mongoose.Types.ObjectId(eventId) }
    );

    console.log('\nVerification:');
    console.log('Event:', event.name);
    console.log('Venue ID:', event.venue || event.venueId);
    console.log('\n🎯 Try the frontend now at:');
    console.log(`http://localhost:3000/events/${eventId}/seating`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

useDefaultStadium();
