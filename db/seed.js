import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Package from './models/Package.js';
import Vehicle from './models/Vehicle.js';
import Destination from './models/Destination.js';
import Enquiry from './models/Enquiry.js';
import Content from './models/Content.js';
import Admin from './models/Admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return defaultValue;
  }
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set. Add it to your .env file.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // --- Packages ---
  const existingPkgs = await Package.countDocuments();
  if (existingPkgs === 0) {
    const packages = readJSON('packages.json', []);
    if (packages.length) {
      await Package.insertMany(packages);
      console.log(`📦 Seeded ${packages.length} packages`);
    }
  } else {
    console.log(`📦 Packages already seeded (${existingPkgs} docs)`);
  }

  // --- Vehicles ---
  const existingVeh = await Vehicle.countDocuments();
  if (existingVeh === 0) {
    const vehicles = readJSON('vehicles.json', []);
    if (vehicles.length) {
      await Vehicle.insertMany(vehicles);
      console.log(`🚗 Seeded ${vehicles.length} vehicles`);
    }
  } else {
    console.log(`🚗 Vehicles already seeded (${existingVeh} docs)`);
  }

  // --- Destinations ---
  const existingDest = await Destination.countDocuments();
  if (existingDest === 0) {
    const destinations = readJSON('destinations.json', []);
    if (destinations.length) {
      await Destination.insertMany(destinations);
      console.log(`📍 Seeded ${destinations.length} destinations`);
    }
  } else {
    console.log(`📍 Destinations already seeded (${existingDest} docs)`);
  }

  // --- Enquiries ---
  const existingEnq = await Enquiry.countDocuments();
  if (existingEnq === 0) {
    const enquiries = readJSON('enquiries.json', []);
    if (enquiries.length) {
      await Enquiry.insertMany(enquiries);
      console.log(`📧 Seeded ${enquiries.length} enquiries`);
    }
  } else {
    console.log(`📧 Enquiries already seeded (${existingEnq} docs)`);
  }

  // --- Content ---
  const existingContent = await Content.countDocuments();
  if (existingContent === 0) {
    const content = readJSON('content.json', {});
    await Content.create({ key: 'site-content', ...content });
    console.log('📝 Seeded website content');
  } else {
    console.log('📝 Content already seeded');
  }

  // --- Admin User ---
  const existingAdmin = await Admin.countDocuments();
  if (existingAdmin === 0) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    await Admin.create({
      username: 'admin',
      passwordHash: defaultPassword,  // Will be hashed by pre-save hook
      role: 'owner',
      name: 'Nimal Wickramasinghe (Owner)'
    });
    console.log('👤 Created default admin user (username: admin)');
  } else {
    console.log(`👤 Admin users already exist (${existingAdmin})`);
  }

  console.log('\n✅ Seed complete!');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
