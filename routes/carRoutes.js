const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Car = require('../models/Car');
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/add', upload.single('image'), async (req, res) => {
  try {
    const { name, brand, seats, pricePerDay, gearType, fuelType, ac } = req.body;
    
    // Debug: Log request body
    console.log('Request Body:');
    console.log('Uploaded File:');

    // Validate required fields
    if (!name || !brand || !seats || !pricePerDay || !gearType || !fuelType) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Car image is required' 
      });
    }

    const newCar = new Car({
      name,
      brand,
      seats: parseInt(seats),
      pricePerDay: parseFloat(pricePerDay),
      gearType,
      fuelType,
      ac: ac === 'true' || ac === true,
      image: `/uploads/${req.file.filename}`,
      available: true
    });

    await newCar.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Car added successfully',
      car: newCar 
    });
  } catch (err) {
    console.error('Add Car Error:', err);
    
    // Delete uploaded file if error occurred
    if (req.file) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to add car',
      error: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});

module.exports = router;