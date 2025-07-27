// models/car.js
const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  seats: { type: Number, required: true, min: 2 },
  pricePerDay: { type: Number, required: true, min: 0 },
  gearType: { type: String, required: true, enum: ['automatic', 'manual'] },
  ac: { type: Boolean, default: true },
  fuelType: {
    type: String,
    required: true,
    enum: ['petrol', 'diesel', 'electric', 'hybrid']
  },
  image: { type: String, required: true },
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('cars', carSchema);
