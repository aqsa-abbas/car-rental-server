// backend/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact'); // Step 1 mein banaya gaya model

// Route to handle contact form submission
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Basic validation (can be more robust with libraries like Joi or Express-validator)
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    const newContact = new Contact({
      name,
      email,
      message
    });

    await newContact.save(); // Data ko database mein save karein

    res.status(201).json({ success: true, message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

module.exports = router;