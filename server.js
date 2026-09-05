import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

// Database & Models
import { connectDB, isDBConnected } from './db/connection.js';
import Package from './db/models/Package.js';
import Vehicle from './db/models/Vehicle.js';
import Destination from './db/models/Destination.js';
import Enquiry from './db/models/Enquiry.js';
import Admin from './db/models/Admin.js';
import Testimonial from './db/models/Testimonial.js';

// Middleware
import { generateToken, verifyToken } from './middleware/auth.js';
import { apiLimiter, authLimiter, sanitizeInput } from './middleware/security.js';

// Cloudinary
import { uploadToCloudinary, isCloudinaryConfigured } from './config/cloudinary.js';

let currentDir = process.cwd();
try {
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  } else if (typeof __dirname !== 'undefined') {
    currentDir = __dirname;
  }
} catch (e) {
  currentDir = process.cwd();
}
const __dirname = currentDir;

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

/* ─────────────────────────────────────────────────────────────
   JSON FILE FALLBACK (when MongoDB is not connected)
   ───────────────────────────────────────────────────────────── */
function readJSON(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return defaultValue;
  }
}

function writeJSON(filename, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
   MIDDLEWARE
   ───────────────────────────────────────────────────────────── */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput());
app.use('/api/', apiLimiter());

// Ensure MongoDB Atlas is connected before executing API routes
app.use(async (req, res, next) => {
  if (!isDBConnected() && process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('MongoDB auto-connect error:', err.message);
    }
  }
  next();
});

// Multer for file uploads (memory storage → Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only image files (jpg, png, gif, webp, svg) are allowed'));
  }
});

/* ═════════════════════════════════════════════════════════════
   SYSTEM / HEALTH API
   ═════════════════════════════════════════════════════════════ */
app.get('/api', (req, res) => {
  res.json({
    name: 'Ceylon Pathways API',
    status: 'online',
    database: isDBConnected() ? 'connected' : 'fallback',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isDBConnected() ? 'connected' : 'fallback',
    timestamp: new Date().toISOString()
  });
});

/* ═════════════════════════════════════════════════════════════
   PACKAGES API
   ═════════════════════════════════════════════════════════════ */
app.get('/api/packages', async (req, res) => {
  try {
    if (isDBConnected()) {
      const packages = await Package.find().sort({ popular: -1, createdAt: -1 }).lean();
      return res.json(packages);
    }
    res.json(readJSON('packages.json', []));
  } catch (err) {
    console.error('GET /api/packages error:', err);
    res.json(readJSON('packages.json', []));
  }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    if (isDBConnected()) {
      const pkg = await Package.findOne({ id: req.params.id }).lean();
      if (!pkg) return res.status(404).json({ error: 'Package not found' });
      return res.json(pkg);
    }
    const packages = readJSON('packages.json', []);
    const pkg = packages.find(p => p.id === req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/packages', verifyToken, async (req, res) => {
  try {
    const newPkg = {
      id: req.body.id || `pkg-${Date.now()}`,
      title: req.body.title || 'Untitled Tour',
      tagline: req.body.tagline || '',
      duration: parseInt(req.body.duration) || 7,
      price: parseFloat(req.body.price) || 899,
      currency: 'USD',
      type: req.body.type || 'Cultural',
      vehicle: req.body.vehicle || 'corolla',
      image: req.body.image || 'packages/cultural-triangle.jpg',
      popular: !!req.body.popular,
      destinations: req.body.destinations || [],
      includes: req.body.includes || [],
      excludes: req.body.excludes || [],
      itinerary: req.body.itinerary || []
    };

    if (isDBConnected()) {
      const doc = await Package.create(newPkg);
      return res.status(201).json(doc.toObject());
    }

    const packages = readJSON('packages.json', []);
    packages.unshift(newPkg);
    writeJSON('packages.json', packages);
    res.status(201).json(newPkg);
  } catch (err) {
    console.error('POST /api/packages error:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

app.put('/api/packages/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      const updated = await Package.findOneAndUpdate(
        { id: req.params.id },
        { ...req.body, id: req.params.id },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'Package not found' });
      return res.json(updated);
    }

    const packages = readJSON('packages.json', []);
    const index = packages.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Package not found' });
    packages[index] = { ...packages[index], ...req.body, id: req.params.id };
    writeJSON('packages.json', packages);
    res.json(packages[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update package' });
  }
});

app.delete('/api/packages/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      const deleted = await Package.findOneAndDelete({ id: req.params.id });
      if (!deleted) return res.status(404).json({ error: 'Package not found' });
      return res.json({ success: true, id: req.params.id });
    }

    let packages = readJSON('packages.json', []);
    const initialLen = packages.length;
    packages = packages.filter(p => p.id !== req.params.id);
    if (packages.length === initialLen) return res.status(404).json({ error: 'Package not found' });
    writeJSON('packages.json', packages);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

/* ═════════════════════════════════════════════════════════════
   VEHICLES API
   ═════════════════════════════════════════════════════════════ */
app.get('/api/vehicles', async (req, res) => {
  try {
    if (isDBConnected()) {
      const vehicles = await Vehicle.find().lean();
      return res.json(vehicles);
    }
    res.json(readJSON('vehicles.json', []));
  } catch (err) {
    res.json(readJSON('vehicles.json', []));
  }
});

app.post('/api/vehicles', verifyToken, async (req, res) => {
  try {
    const newVeh = {
      id: req.body.id || `veh-${Date.now()}`,
      name: req.body.name || 'New Vehicle',
      type: req.body.type || 'Sedan',
      seats: parseInt(req.body.seats) || 3,
      luggage: req.body.luggage || '2 medium bags',
      ac: req.body.ac !== false,
      pricePerDay: parseFloat(req.body.pricePerDay) || 45,
      currency: 'USD',
      available: req.body.available !== false,
      image: req.body.image || 'vehicles/prius.jpg',
      description: req.body.description || ''
    };

    if (isDBConnected()) {
      const doc = await Vehicle.create(newVeh);
      return res.status(201).json(doc.toObject());
    }

    const vehicles = readJSON('vehicles.json', []);
    vehicles.push(newVeh);
    writeJSON('vehicles.json', vehicles);
    res.status(201).json(newVeh);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

app.put('/api/vehicles/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      const updated = await Vehicle.findOneAndUpdate(
        { id: req.params.id },
        { ...req.body, id: req.params.id },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'Vehicle not found' });
      return res.json(updated);
    }

    const vehicles = readJSON('vehicles.json', []);
    const index = vehicles.findIndex(v => v.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Vehicle not found' });
    vehicles[index] = { ...vehicles[index], ...req.body, id: req.params.id };
    writeJSON('vehicles.json', vehicles);
    res.json(vehicles[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

app.delete('/api/vehicles/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      await Vehicle.findOneAndDelete({ id: req.params.id });
      return res.json({ success: true, id: req.params.id });
    }

    let vehicles = readJSON('vehicles.json', []);
    vehicles = vehicles.filter(v => v.id !== req.params.id);
    writeJSON('vehicles.json', vehicles);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

/* ═════════════════════════════════════════════════════════════
   DESTINATIONS API
   ═════════════════════════════════════════════════════════════ */
app.get('/api/destinations', async (req, res) => {
  try {
    if (isDBConnected()) {
      const destinations = await Destination.find().lean();
      return res.json(destinations);
    }
    res.json(readJSON('destinations.json', []));
  } catch (err) {
    res.json(readJSON('destinations.json', []));
  }
});

app.post('/api/destinations', verifyToken, async (req, res) => {
  try {
    const newDest = {
      id: req.body.id || `dest-${Date.now()}`,
      name: req.body.name || 'New Destination',
      region: req.body.region || 'Cultural Triangle',
      shortDesc: req.body.shortDesc || '',
      description: req.body.description || '',
      image: req.body.image || 'destinations/sigiriya.jpg',
      lat: parseFloat(req.body.lat) || 7.8731,
      lng: parseFloat(req.body.lng) || 80.7718,
      typicalDuration: req.body.typicalDuration || 'Half Day',
      bestTime: req.body.bestTime || 'Year-round'
    };

    if (isDBConnected()) {
      const doc = await Destination.create(newDest);
      return res.status(201).json(doc.toObject());
    }

    const destinations = readJSON('destinations.json', []);
    destinations.push(newDest);
    writeJSON('destinations.json', destinations);
    res.status(201).json(newDest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create destination' });
  }
});

app.put('/api/destinations/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      const updated = await Destination.findOneAndUpdate(
        { id: req.params.id },
        { ...req.body, id: req.params.id },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'Destination not found' });
      return res.json(updated);
    }

    const destinations = readJSON('destinations.json', []);
    const index = destinations.findIndex(d => d.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Destination not found' });
    destinations[index] = { ...destinations[index], ...req.body, id: req.params.id };
    writeJSON('destinations.json', destinations);
    res.json(destinations[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update destination' });
  }
});

app.delete('/api/destinations/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      await Destination.findOneAndDelete({ id: req.params.id });
      return res.json({ success: true, id: req.params.id });
    }

    let destinations = readJSON('destinations.json', []);
    destinations = destinations.filter(d => d.id !== req.params.id);
    writeJSON('destinations.json', destinations);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete destination' });
  }
});

/* ═════════════════════════════════════════════════════════════
   ENQUIRIES & BOOKINGS API
   ═════════════════════════════════════════════════════════════ */
app.get('/api/enquiries', async (req, res) => {
  try {
    if (!isDBConnected() && process.env.MONGODB_URI) {
      await connectDB();
    }
    if (isDBConnected()) {
      const enquiries = await Enquiry.find().sort({ timestamp: -1 }).lean();
      return res.json(enquiries);
    }
    res.json(readJSON('enquiries.json', []));
  } catch (err) {
    console.error('GET /api/enquiries error:', err);
    res.json(readJSON('enquiries.json', []));
  }
});

app.post('/api/enquiries', async (req, res) => {
  try {
    if (!isDBConnected() && process.env.MONGODB_URI) {
      await connectDB();
    }
    const b = req.body || {};
    const newEnq = {
      id: `ENQ-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      status: 'new',
      name: b.name || 'Traveler',
      email: b.email || '',
      phone: b.phone || '',
      message: b.message || b.notes || '',
      notes: b.notes || b.message || '',
      packageId: b.packageId || '',
      packageTitle: b.packageTitle || (b.tripDays ? `${b.tripDays}-Day Custom Tour` : ''),
      travelDates: b.travelDates || b.date || '',
      date: b.date || b.travelDates || '',
      travelers: parseInt(b.travelers || b.guests || b.adults) || 1,
      guests: b.guests || b.adults || '1',
      adults: b.adults || b.guests || '1',
      tripDays: parseInt(b.tripDays) || 7,
      destinations: Array.isArray(b.destinations) ? b.destinations : [],
      vehicle: b.vehicle || '',
      hotelTier: b.hotelTier || '',
      type: b.type || (b.packageId ? 'package' : 'custom_tour'),
      ...b
    };

    if (isDBConnected()) {
      const doc = await Enquiry.create(newEnq);
      return res.status(201).json(doc.toObject());
    }

    const enquiries = readJSON('enquiries.json', []);
    enquiries.unshift(newEnq);
    writeJSON('enquiries.json', enquiries);
    res.status(201).json(newEnq);
  } catch (err) {
    console.error('POST /api/enquiries error:', err);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
});

app.patch('/api/enquiries/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      const updates = {};
      if (req.body.status) updates.status = req.body.status;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;

      const updated = await Enquiry.findOneAndUpdate(
        { id: req.params.id },
        updates,
        { new: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'Enquiry not found' });
      return res.json(updated);
    }

    const enquiries = readJSON('enquiries.json', []);
    const enq = enquiries.find(e => e.id === req.params.id || e.id === parseInt(req.params.id));
    if (!enq) return res.status(404).json({ error: 'Enquiry not found' });
    if (req.body.status) enq.status = req.body.status;
    if (req.body.notes !== undefined) enq.notes = req.body.notes;
    writeJSON('enquiries.json', enquiries);
    res.json(enq);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

app.delete('/api/enquiries/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      await Enquiry.findOneAndDelete({ id: req.params.id });
      return res.json({ success: true, id: req.params.id });
    }

    let enquiries = readJSON('enquiries.json', []);
    enquiries = enquiries.filter(e => e.id !== req.params.id && e.id !== parseInt(req.params.id));
    writeJSON('enquiries.json', enquiries);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

const DEFAULT_TESTIMONIALS = [
  {
    id: 'testimonial-1',
    name: 'Sarah & Mark Jenkins',
    origin: 'London, United Kingdom',
    rating: 5,
    avatar: 'hero/beach.jpg',
    text: 'Nimal was more than a chauffeur; he was a gracious host who made our honeymoon across Sigiriya and Galle absolutely magical. Exceptional service from Ceylon Pathways!',
    featured: true,
    order: 1
  },
  {
    id: 'testimonial-2',
    name: 'Dr. Stefan Müller',
    origin: 'Munich, Germany',
    rating: 5,
    avatar: 'hero/tea-plantations.jpg',
    text: 'Flawless execution of our 10-day Grand Tour. The KDH van was pristine, air-conditioned, and our guide knew every hidden viewpoint across Ella and Yala.',
    featured: true,
    order: 2
  },
  {
    id: 'testimonial-3',
    name: 'Elena Rostova',
    origin: 'Zurich, Switzerland',
    rating: 5,
    avatar: 'destinations/sigiriya.jpg',
    text: 'Tailored our itinerary with ease using their online builder. Transparent pricing, top boutique hotels, and seamless transfers throughout.',
    featured: true,
    order: 3
  }
];

/* ═════════════════════════════════════════════════════════════
   TESTIMONIALS API
   ═════════════════════════════════════════════════════════════ */
app.get('/api/testimonials', async (req, res) => {
  try {
    if (isDBConnected()) {
      let testimonials = await Testimonial.find().sort({ order: 1, createdAt: -1 }).lean();
      if (testimonials.length === 0) {
        // Auto seed default testimonials if collection is empty
        await Testimonial.insertMany(DEFAULT_TESTIMONIALS);
        testimonials = await Testimonial.find().sort({ order: 1, createdAt: -1 }).lean();
      }
      return res.json(testimonials);
    }
    const fallback = readJSON('testimonials.json', DEFAULT_TESTIMONIALS);
    res.json(fallback);
  } catch (err) {
    console.error('GET /api/testimonials error:', err);
    res.json(DEFAULT_TESTIMONIALS);
  }
});

app.post('/api/testimonials', verifyToken, async (req, res) => {
  try {
    const newTestimonial = {
      id: req.body.id || `test-${Date.now()}`,
      name: req.body.name || 'Anonymous Traveler',
      origin: req.body.origin || 'International Traveler',
      rating: parseInt(req.body.rating) || 5,
      avatar: req.body.avatar || 'hero/beach.jpg',
      text: req.body.text || '',
      featured: req.body.featured !== false,
      order: parseInt(req.body.order) || 0
    };

    if (isDBConnected()) {
      const doc = await Testimonial.create(newTestimonial);
      return res.status(201).json(doc.toObject());
    }

    const testimonials = readJSON('testimonials.json', DEFAULT_TESTIMONIALS);
    testimonials.unshift(newTestimonial);
    writeJSON('testimonials.json', testimonials);
    res.status(201).json(newTestimonial);
  } catch (err) {
    console.error('POST /api/testimonials error:', err);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

app.put('/api/testimonials/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      const updated = await Testimonial.findOneAndUpdate(
        { id: req.params.id },
        { ...req.body, id: req.params.id },
        { returnDocument: 'after', runValidators: true }
      ).lean();
      if (!updated) return res.status(404).json({ error: 'Testimonial not found' });
      return res.json(updated);
    }

    const testimonials = readJSON('testimonials.json', DEFAULT_TESTIMONIALS);
    const index = testimonials.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Testimonial not found' });
    testimonials[index] = { ...testimonials[index], ...req.body, id: req.params.id };
    writeJSON('testimonials.json', testimonials);
    res.json(testimonials[index]);
  } catch (err) {
    console.error('PUT /api/testimonials/:id error:', err);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

app.delete('/api/testimonials/:id', verifyToken, async (req, res) => {
  try {
    if (isDBConnected()) {
      const deleted = await Testimonial.findOneAndDelete({ id: req.params.id });
      if (!deleted) return res.status(404).json({ error: 'Testimonial not found' });
      return res.json({ success: true, id: req.params.id });
    }

    let testimonials = readJSON('testimonials.json', DEFAULT_TESTIMONIALS);
    testimonials = testimonials.filter(t => t.id !== req.params.id);
    writeJSON('testimonials.json', testimonials);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('DELETE /api/testimonials/:id error:', err);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

/* ═════════════════════════════════════════════════════════════
   OPERATIONS STATS API
   ═════════════════════════════════════════════════════════════ */
app.get('/api/stats', async (req, res) => {
  try {
    let totalLeads, newLeads, bookedLeads, totalPackages, vehicles, availableVehicles;

    if (isDBConnected()) {
      totalLeads = await Enquiry.countDocuments();
      newLeads = await Enquiry.countDocuments({ status: 'new' });
      bookedLeads = await Enquiry.countDocuments({ status: 'booked' });
      totalPackages = await Package.countDocuments();
      const totalVehicles = await Vehicle.countDocuments();
      availableVehicles = await Vehicle.countDocuments({ available: true });
      vehicles = { total: totalVehicles, available: availableVehicles };
    } else {
      const enquiries = readJSON('enquiries.json', []);
      const pkgs = readJSON('packages.json', []);
      const vehs = readJSON('vehicles.json', []);
      totalLeads = enquiries.length;
      newLeads = enquiries.filter(e => e.status === 'new').length;
      bookedLeads = enquiries.filter(e => e.status === 'booked').length;
      totalPackages = pkgs.length;
      availableVehicles = vehs.filter(v => v.available !== false).length;
      vehicles = { total: vehs.length, available: availableVehicles };
    }

    res.json({
      totalLeads,
      newLeads,
      bookedLeads,
      totalPackages,
      activeFleet: `${vehicles.available} / ${vehicles.total}`,
      waClicks: 18
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

/* ═════════════════════════════════════════════════════════════
   IMAGE UPLOAD API (Cloudinary or local fallback)
   ═════════════════════════════════════════════════════════════ */
app.post('/api/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    // Determine upload category for Cloudinary folder
    const category = req.body.category || 'general';
    const folder = `ceylon-pathways/${category}`;

    // Option 1: File upload via multer (multipart/form-data)
    if (req.file) {
      if (isCloudinaryConfigured()) {
        const result = await uploadToCloudinary(req.file.buffer, folder);
        return res.status(201).json({
          success: true,
          imagePath: result.secure_url,
          publicId: result.public_id
        });
      }

      // Local fallback
      const safeName = `${req.file.originalname.replace(/[^a-z0-9_.-]+/gi, '-').toLowerCase().split('.')[0]}-${Date.now()}${path.extname(req.file.originalname)}`;
      const uploadDir = path.join(__dirname, 'images', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, safeName), req.file.buffer);

      // Also write to dist and public
      for (const dir of ['public/images/uploads', 'dist/images/uploads']) {
        const target = path.join(__dirname, dir);
        if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
        try { fs.writeFileSync(path.join(target, safeName), req.file.buffer); } catch(e) {}
      }

      return res.status(201).json({ success: true, imagePath: `uploads/${safeName}` });
    }

    // Option 2: Base64 JSON upload (legacy support)
    const { data, filename } = req.body;
    if (data && filename) {
      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      if (isCloudinaryConfigured()) {
        const result = await uploadToCloudinary(buffer, folder);
        return res.status(201).json({
          success: true,
          imagePath: result.secure_url,
          publicId: result.public_id
        });
      }

      // Local fallback
      const ext = path.extname(filename) || '.jpg';
      const safeName = `${path.basename(filename, ext).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-${Date.now()}${ext}`;
      const uploadDir = path.join(__dirname, 'images', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, safeName), buffer);

      for (const dir of ['public/images/uploads', 'dist/images/uploads']) {
        const target = path.join(__dirname, dir);
        if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
        try { fs.writeFileSync(path.join(target, safeName), buffer); } catch(e) {}
      }

      return res.status(201).json({ success: true, imagePath: `uploads/${safeName}` });
    }

    res.status(400).json({ error: 'No image provided. Send as multipart file or base64 JSON.' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

/* ═════════════════════════════════════════════════════════════
   AUTHENTICATION API (JWT)
   ═════════════════════════════════════════════════════════════ */
app.post('/api/auth/login', authLimiter(), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Ensure database connection is ready (handles serverless cold starts)
    if (!isDBConnected()) {
      await connectDB();
    }

    const cleanPass = password.trim();

    if (isDBConnected()) {
      const u = username.toLowerCase().trim();
      const admin = await Admin.findOne({
        $or: [
          { username: u },
          ...(u === 'owner' || u === 'admin' ? [{ role: 'owner' }] : [])
        ]
      });
      if (!admin) {
        return res.status(401).json({ error: 'Invalid username or passcode.' });
      }

      const isMatch = await admin.comparePassword(cleanPass);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const token = generateToken(admin);
      return res.json({
        success: true,
        token,
        user: {
          username: admin.username,
          role: admin.role,
          name: admin.name
        }
      });
    }

    // Fallback: simple password check (for dev or if MongoDB is temporarily unreachable)
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    if (cleanPass === defaultPassword || cleanPass === 'admin') {
      const token = generateToken({
        _id: 'local-admin',
        username: username || 'admin',
        role: username === 'staff' ? 'staff' : 'owner'
      });
      return res.json({
        success: true,
        token,
        user: {
          username: username || 'admin',
          role: username === 'staff' ? 'staff' : 'owner',
          name: username === 'staff' ? 'Staff Operator' : 'Nimal Wickramasinghe (Owner)'
        }
      });
    }

    res.status(401).json({ error: 'Invalid credentials.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
});

// Register new admin (owner-only, protected)
app.post('/api/auth/register', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can create admin accounts.' });
    }

    const { username, password, role, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (isDBConnected()) {
      const existing = await Admin.findOne({ username: username.toLowerCase() });
      if (existing) {
        return res.status(409).json({ error: 'Username already exists.' });
      }

      const admin = await Admin.create({
        username: username.toLowerCase(),
        passwordHash: password, // Will be hashed by pre-save hook
        role: role || 'staff',
        name: name || username
      });

      return res.status(201).json({
        success: true,
        user: { username: admin.username, role: admin.role, name: admin.name }
      });
    }

    res.status(503).json({ error: 'Database not connected. Cannot register users in fallback mode.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create admin account.' });
  }
});

/* ═════════════════════════════════════════════════════════════
   STATIC ASSETS SERVING
   ═════════════════════════════════════════════════════════════ */
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

/* ═════════════════════════════════════════════════════════════
   START SERVER (Local & VM Environments)
   ═════════════════════════════════════════════════════════════ */
export async function startServer() {
  // Try to connect to MongoDB (non-blocking — falls back to JSON files)
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n===============================================`);
    console.log(`Ceylon Pathways Backend API running on port ${PORT}`);
    console.log(`Database: ${isDBConnected() ? '✅ MongoDB Atlas' : '⚠ JSON file fallback'}`);
    console.log(`Cloudinary: ${isCloudinaryConfigured() ? '✅ Configured' : '⚠ Local storage fallback'}`);
    console.log(`Public Site: http://localhost:${PORT}`);
    console.log(`Admin Portal: http://localhost:${PORT}/admin.html`);
    console.log(`===============================================\n`);
  });
}

// Only start the HTTP listener if not running in a serverless function
if (!process.env.NETLIFY && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
