# Deploying Project Nocturna to Vercel

## Overview
Project Nocturna is configured for seamless deployment to Vercel. The application consists of:
- A frontend with interactive maps and data visualization
- A backend API for retrieving light pollution data
- Support for multiple data sources including NASA APIs and local datasets

## Prerequisites
Before deploying to Vercel, ensure you have accounts with:
- [Vercel](https://vercel.com/)
- [Supabase](https://supabase.io/) (for database)
- [NASA Earthdata](https://earthdata.nasa.gov/) (for VIIRS data)

## Deployment Steps

### Option 1: Deploy Directly via GitHub
1. Fork this repository to your GitHub account
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project" and import your forked repository
4. Vercel will automatically detect the project and configure the settings
5. Add the required environment variables (see below)
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI
1. Install the Vercel CLI globally:
```bash
npm install -g vercel
```

2. Run the deployment command:
```bash
vercel --prod
```

3. Follow the prompts and add environment variables when prompted

## Required Environment Variables

Add these environment variables in your Vercel dashboard under Settings → Environment Variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NASA_API_KEY=your-nasa-api-key
EARTHDATA_USERNAME=your-username
EARTHDATA_PASSWORD=your-password
NODE_ENV=production
OPENAI_API_KEY=your-openai-api-key (optional)
```

## Configuration Notes

- The `vercel.json` file is pre-configured for optimal performance
- Static assets (CSS, JS, images) are served with appropriate caching headers
- API routes are handled by the Node.js server
- The application uses fallback mechanisms when external APIs are unavailable

## Post-Deployment

After successful deployment:
1. Visit your deployed URL
2. Test the API endpoints
3. Verify that the map and data visualization features work correctly
4. Check that both Citizen Mode and Scientific Mode function as expected

## Troubleshooting

- If you encounter CORS issues, check that your domain is added to the allowed origins
- If API calls fail, verify that your environment variables are correctly set
- For database connection issues, ensure your Supabase configuration is correct
- Check the Vercel logs for detailed error information

## Scaling Considerations

- The application is designed to scale horizontally on Vercel
- Consider upgrading your Supabase plan if you expect high traffic
- The NASA API has rate limits that should be respected in production