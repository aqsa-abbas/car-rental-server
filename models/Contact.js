// backend/models/Contact.js
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true // Leading/trailing spaces automatically removed
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true, // Email will be stored in lowercase
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'] // Basic email validation
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now // Automatically adds the creation date
  }
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;