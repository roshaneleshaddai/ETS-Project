const mongoose = require('mongoose');
require('dotenv').config();

// Connect to DB (using standard URI form or env)
const uri = process.env.DB_URI || 'mongodb://localhost:27017/providence'; // Guessing the DB name/string

const run = async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const venueId = '697c5de58c502c2b77719feb';
    const eventId = '6971d366ea5645dcaf823b82';

    // Check Event
    const event = await mongoose.connection
      .collection('events')
      .findOne({ _id: new mongoose.Types.ObjectId(eventId) });
    console.log('Event Found:', !!event, event ? event.venue : 'N/A');

    // Check Venue
    if (mongoose.Types.ObjectId.isValid(venueId)) {
      const venue = await mongoose.connection
        .collection('venues')
        .findOne({ _id: new mongoose.Types.ObjectId(venueId) });
      console.log('Venue Found (from ID in code):', !!venue);
    } else {
      console.log('Venue ID in code is Invalid ObjectId:', venueId);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
};

run();
