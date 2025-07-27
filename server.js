require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true
}));
app.use(express.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

const uploadDir = path.join(__dirname, 'uploads');
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
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log(`✅ MongoDB Connected to database: "${mongoose.connection.name}"`);
});
mongoose.connection.on('error', (err) => console.error('❌ MongoDB Connection Error:', err));
mongoose.connection.on('disconnected', () => console.log('⚠️  MongoDB Disconnected'));

connectDB();

// --- Schemas ---

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: { type: String, required: true, minlength: 6 }
});
const User = mongoose.model('User', userSchema);

// Car Schema
const carSchema = new mongoose.Schema({
  name: String,
  brand: String,
  seats: Number,
  pricePerDay: Number,
  ac: Boolean,
  fuelType: String,
  image: { type: String },
  available: { type: Boolean, default: true }
});
const Car = mongoose.model('Car', carSchema);

// NEW: Contact Message Schema
const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
// Admin Signup Schema
const adminSignupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@admin\.com$/, 'Email must be a valid @admin.com address']
  },
  password: { type: String, required: true, minlength: 6 }
});
const AdminSignup = mongoose.model('AdminSignup', adminSignupSchema);


// --- JWT Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Routes ---
// Admin Login Route
app.post('/api/admin/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;

      // Check if the email ends with @admin.com
      if (!email.endsWith('@admin.com')) {
        return res.status(403).json({ success: false, message: 'Access denied: Not an admin email' });
      }

      const admin = await AdminSignup.findOne({ email });
      if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });

      res.json({
        success: true,
        token,
        name: admin.name,
        role: 'admin'
      });
    } catch (error) {
      console.error('Admin Login Error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);
app.delete('/api/car/delete/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCar = await Car.findByIdAndDelete(id);

    if (!deletedCar) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    // Optional: delete the image file from uploads folder
    if (deletedCar.image) {
      const imagePath = path.join(__dirname, deletedCar.image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    res.json({ success: true, message: 'Car deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete car' });
  }
});


// Admin Signup Route

app.post('/api/admin/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').custom(email => {
      if (!email.endsWith('@admin.com')) {
        throw new Error('Email must end with @admin.com');
      }
      return true;
    }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password } = req.body;
      const existingAdmin = await AdminSignup.findOne({ email });
      if (existingAdmin) return res.status(409).json({ success: false, message: 'Admin email already exists' });

      const hashedPassword = await bcrypt.hash(password, 12);
      const newAdmin = new AdminSignup({ name, email, password: hashedPassword });
      await newAdmin.save();

      res.status(201).json({ success: true, message: 'Admin registered successfully' });
    } catch (error) {
      console.error('Admin Signup Error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Signup
app.post('/api/user/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(409).json({ success: false, message: 'Email already exists' });

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new User({ name, email, password: hashedPassword });
      await newUser.save();

      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });

      res.status(201).json({
        success: true,
        token,
        user: { id: newUser._id, name: newUser.name, email: newUser.email }
      });
    } catch (error) {
      console.error('Signup Error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Login
app.post('/api/user/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });

      res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Add Car (No Auth, with image upload)
app.post('/api/car/add', upload.single('image'), async (req, res) => {
  try {
    const { name, brand, seats, pricePerDay, gearType, fuelType, ac } = req.body;
    // Debug logs
    console.log('Request Body:', req.body);
    console.log('Uploaded File:', req.file);

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
    res.status(201).json({ success: true, message: 'Car added successfully', car: newCar });
  } catch (err) {
    console.error('Add Car Error:', err);
    if (req.file) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
    }
    res.status(500).json({ success: false, message: 'Failed to add car', error: err.message });
  }
});

// View All Cars
app.get('/api/car/all', async (req, res) => {
  try {
    const cars = await Car.find();
    res.json({ success: true, cars });
  } catch (err) {
    console.error('Fetch Cars Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cars' });
  }
});

// Update Car (Protected)
app.put('/api/car/update/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCar = await Car.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedCar) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    res.json({ success: true, message: 'Car updated successfully', car: updatedCar });
  } catch (err) {
    console.error('Update Car Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update car' });
  }
});

// NEW: Contact Form Submission Route
app.post('/api/contact',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
    body('message').trim().notEmpty().withMessage('Message is required.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg }); // Send first error message
    }

    try {
      const { name, email, message } = req.body;

      const newContactMessage = new ContactMessage({
        name,
        email,
        message
      });

      await newContactMessage.save(); // Save to MongoDB

      res.status(201).json({ success: true, message: 'Thank you for contacting us! We will get back to you soon.' });
    } catch (error) {
      console.error('Error saving contact message:', error);
      res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
  }
);


// Protected Test Route
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is protected data', user: req.user });
});

// General Home Route
app.get('/', (req, res) => {
    res.send('Welcome to the CAR-RENTAL Backend API!');
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});