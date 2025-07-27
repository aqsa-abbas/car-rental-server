const express = require('express');
const router = express.Router();
const User = require('./user');
const jwt = require('jsonwebtoken');

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Determine role based on email
    const role = email.endsWith('@admin.com') ? 'admin' : 'user';

    // Create new user
    const user = new User({ name, email, password, role });
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      token,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      role: user.role,
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports=router;
