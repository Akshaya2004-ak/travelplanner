// server/models/TripMember.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tripMemberSchema = new Schema({
  tripId: {
    type: Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    default: 'editor'
  },
  invitedEmail: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Prevent duplicate invitations
tripMemberSchema.index({ tripId: 1, invitedEmail: 1 }, { unique: true });

module.exports = mongoose.model('TripMember', tripMemberSchema);