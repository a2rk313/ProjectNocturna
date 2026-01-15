// api/hello.js - Simple test API route for Vercel
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Hello from Vercel!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};