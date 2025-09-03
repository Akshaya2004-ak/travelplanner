// server/models/Trip.model.js
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// This defines the structure of a Trip document
const tripSchema = new Schema({
  title: {
    type: String,
    required: true // This field must be provided
  },
  destination: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  // NEW: Array of activities within this trip
  activities: [{
    title: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    time: {
      type: String // Optional time (e.g., "10:00")
    },
    description: {
      type: String // Optional description
    },
    type: {
      type: String,
      enum: ['activity', 'flight', 'hotel', 'food'], // Allowed values
      default: 'activity'
    }
  }]
}, {
  timestamps: true, // This will automatically add `createdAt` and `updatedAt` fields
});

// Create a model based on the schema
// 'Trip' is the name of the collection in the database
const Trip = mongoose.model('Trip', tripSchema);

// Export the model to use it in other files (like our routes)
module.exports = Trip;