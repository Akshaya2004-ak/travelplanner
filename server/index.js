// server/index.js

// 1. Import the modules we just installed
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Import Mongoose
const Trip = require('./models/Trip.model');
const User = require('./models/User.model');
const TripMember = require('./models/TripMember.model'); // NEW: Import TripMember model
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Loads variables from .env file

// 2. Create an Express application
const app = express();
const PORT = process.env.PORT || 5000; // Use the port from an environment variable or default to 5000

// 3. Apply Middleware
app.use(cors()); // Enable CORS for all requests
app.use(express.json()); // Allows the server to accept JSON in the body of a request

// 4. CONNECT TO MONGODB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB database connection established successfully!"))
.catch((error) => console.error("MongoDB connection error:", error));

// 5. Define a simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the Travel Planner backend!' });
});

// 6. POST route to create a new trip
app.post('/api/trips', async (req, res) => {
  try {
    // Get the data from the request body sent by the frontend
    const { title, destination, startDate, endDate } = req.body;

    // Use the Trip model to create a new trip in the database
    const newTrip = await Trip.create({
      title,
      destination,
      startDate,
      endDate
    });

    // If successful, send back the new trip data as a JSON response
    res.status(201).json(newTrip); // 201 status means "Created"

  } catch (error) {
    // If there's an error, log it and send a error message back
    console.log("Error creating a new trip:", error);
    res.status(500).json({ error: "Failed to create trip." }); // 500 status means "Server Error"
  }
});

// 7. GET route to fetch all trips
app.get('/api/trips', async (req, res) => {
  try {
    // Use the Trip model to find all trips in the database
    const allTrips = await Trip.find();
    // Send the list of trips back as JSON
    res.status(200).json(allTrips);
  } catch (error) {
    console.log("Error getting trips:", error);
    res.status(500).json({ error: "Failed to fetch trips." });
  }
});

// 8. DELETE route to remove a trip by its ID
app.delete('/api/trips/:id', async (req, res) => {
  try {
    const tripId = req.params.id; // Get the ID from the URL parameter

    // Use the Trip model to find and delete the trip by its _id
    const deletedTrip = await Trip.findByIdAndDelete(tripId);

    if (!deletedTrip) {
      return res.status(404).json({ error: "Trip not found." });
    }

    // If successful, send back a confirmation message
    res.status(200).json({ message: `Trip '${deletedTrip.title}' was deleted successfully.` });

  } catch (error) {
    console.log("Error deleting trip:", error);
    res.status(500).json({ error: "Failed to delete trip." });
  }
});

// 9. POST route to add an activity to a specific trip
app.post('/api/trips/:tripId/activities', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { title, date, time, description, type } = req.body;

    // Find the trip and push the new activity
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      { $push: { activities: { title, date, time, description, type } } },
      { new: true } // Return the updated document
    );

    if (!updatedTrip) {
      return res.status(404).json({ error: "Trip not found." });
    }

    res.status(201).json(updatedTrip);

  } catch (error) {
    console.log("Error adding activity:", error);
    res.status(500).json({ error: "Failed to add activity." });
  }
});

// 10. SIGNUP route - allows new users to create an account
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Create the new user in database
    const newUser = await User.create({ username, email, password });

    // 2. Create a token (JWT) for the new user
    const token = jwt.sign(
      { id: newUser._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    // 3. Send back the token and user info (without password)
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.log("Error in signup:", error);
    res.status(500).json({ error: "Failed to create account. Username or email may already exist." });
  }
});

// 11. LOGIN route - allows existing users to log in
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists and password is correct
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Check if password is correct (using the method from our User model)
    const isPasswordValid = await user.correctPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Create a token (JWT) for the user
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 4. Send back the token and user info (without password)
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.log("Error in login:", error);
    res.status(500).json({ error: "Failed to login." });
  }
});

// NEW: 12. POST route to invite a friend to a trip
app.post('/api/trips/:tripId/invite', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { email, role } = req.body;

    // 1. Verify the trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found." });
    }

    // 2. Check if invitation already exists
    const existingInvite = await TripMember.findOne({
      tripId: tripId,
      invitedEmail: email.toLowerCase()
    });

    if (existingInvite) {
      return res.status(400).json({ error: "User has already been invited to this trip." });
    }

    // 3. Create the invitation
    const newInvitation = await TripMember.create({
      tripId: tripId,
      invitedEmail: email.toLowerCase(),
      role: role || 'editor',
      status: 'pending'
    });

    // 4. In a real app, you would send an email here
    console.log(`Invitation sent to ${email} for trip: ${trip.title}`);
    
    // 5. Return success response
    res.status(201).json({
      message: `Invitation sent to ${email}`,
      invitation: newInvitation
    });

  } catch (error) {
    console.log("Error sending invitation:", error);
    res.status(500).json({ error: "Failed to send invitation." });
  }
});
// GET route to fetch user's trip invitations
app.get('/api/user/invitations', async (req, res) => {
  try {
    // In a real app, you would get user ID from JWT token
    // For now, we'll use email from query parameter for testing
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    // Find all invitations for this email
    const invitations = await TripMember.find({
      invitedEmail: email.toLowerCase(),
      status: 'pending'
    }).populate('tripId', 'title destination startDate endDate');

    res.status(200).json(invitations);

  } catch (error) {
    console.log("Error fetching invitations:", error);
    res.status(500).json({ error: "Failed to fetch invitations." });
  }
});
// PUT route to accept a trip invitation
app.put('/api/invitations/:invitationId/accept', async (req, res) => {
  try {
    const { invitationId } = req.params;

    // Update the invitation status to accepted
    const updatedInvitation = await TripMember.findByIdAndUpdate(
      invitationId,
      { status: 'accepted' },
      { new: true }
    ).populate('tripId', 'title destination');

    if (!updatedInvitation) {
      return res.status(404).json({ error: "Invitation not found." });
    }

    res.status(200).json({
      message: `You have joined the trip: ${updatedInvitation.tripId.title}`,
      trip: updatedInvitation.tripId
    });

  } catch (error) {
    console.log("Error accepting invitation:", error);
    res.status(500).json({ error: "Failed to accept invitation." });
  }
});

// 13. Start the server and make it listen for requests
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});