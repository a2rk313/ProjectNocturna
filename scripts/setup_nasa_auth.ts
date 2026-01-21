#!/usr/bin/env ts-node
/**
 * Setup script for NASA Earthdata authentication
 * Helps users configure their NASA Earthdata credentials
 */

import fs from 'fs';
import path from 'path';
import { nasaAuth } from '../lib/nasa_auth';
import 'dotenv/config';

async function setupNasaAuth() {
  console.log('🔐 NASA Earthdata Authentication Setup');
  console.log('=====================================');
  
  // Check if .env file exists
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.log('\n📝 Creating .env file...');
    
    const envContent = `# NASA Earthdata Credentials
# Register at: https://urs.earthdata.nasa.gov/
NASA_EARTHDATA_USERNAME=your_nasa_username
NASA_EARTHDATA_PASSWORD=your_nasa_password

# Optional: Additional settings
NASA_BASE_URL=https://cmr.earthdata.nasa.gov
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with template credentials');
  } else {
    console.log('\n✅ Found existing .env file');
  }
  
  // Check if credentials are set
  const username = process.env.NASA_EARTHDATA_USERNAME;
  const password = process.env.NASA_EARTHDATA_PASSWORD;
  
  if (!username || !password || username === 'your_nasa_username' || password === 'your_nasa_password') {
    console.log('\n⚠️  Warning: Default/unconfigured credentials detected!');
    console.log('\n📋 To configure your NASA Earthdata credentials:');
    console.log('   1. Register at: https://urs.earthdata.nasa.gov/');
    console.log('   2. Edit the .env file with your actual credentials');
    console.log('   3. Replace:');
    console.log('      NASA_EARTHDATA_USERNAME=your_nasa_username');
    console.log('      NASA_EARTHDATA_PASSWORD=your_nasa_password');
    console.log('   4. With your actual NASA Earthdata username and password');
    console.log('\n💡 Tip: Never commit your .env file to version control!');
    
    return;
  }
  
  console.log('\n🧪 Testing your NASA Earthdata authentication...');
  
  try {
    const isAuthenticated = await nasaAuth.authenticate();
    
    if (isAuthenticated) {
      console.log('✅ Success! Your NASA Earthdata authentication is working.');
      console.log('\n🚀 You can now run the VIIRS pipeline:');
      console.log('   npm run viirs-pipeline');
    } else {
      console.log('❌ Authentication failed. Please check your credentials.');
      console.log('\n🔧 Troubleshooting tips:');
      console.log('   - Verify your username and password are correct');
      console.log('   - Ensure your NASA Earthdata account is activated');
      console.log('   - Check that your account has access to VIIRS data');
      console.log('   - Visit https://urs.earthdata.nasa.gov/ to manage your account');
    }
  } catch (error) {
    console.error('❌ Error during authentication test:', error);
  }
}

// Run the setup
setupNasaAuth().catch(console.error);

export { setupNasaAuth };