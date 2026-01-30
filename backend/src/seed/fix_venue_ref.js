const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DB_URI || 'mongodb://localhost:27017/providence';

const run = async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    // Find ANY valid venue
    const venue = await mongoose.connection.collection('venues').findOne({});
    console.log('Valid Venue ID:', venue ? venue._id.toString() : 'NONE');

    if (venue) {
      const eventId = '6971d366ea5645dcaf823b82';
      // Update the event to point to this valid venue
      // Note: Schema uses 'venueId' but logs showed 'venue'? Check both.
      await mongoose.connection
        .collection('events')
        .updateOne(
          { _id: new mongoose.Types.ObjectId(eventId) },
          { $set: { venueId: venue._id, venue: venue._id } },
        );
      console.log('Updated Event', eventId, 'to use Venue', venue._id);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
};

run();
