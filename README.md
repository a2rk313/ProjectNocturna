<div align="center">

[![Nocturna Logo](https://raw.githubusercontent.com/a2rk313/ProjectNocturna/refs/heads/a2rk/images/logo.png)](https://github.com/a2rk313/ProjectNocturna)


# **Project Nocturna**

</div>

A WebGIS platform that enables everyday users to discover prime astronomical observation sites while empowering scientists and researchers to conduct light pollution data analysis.

## 🚀 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/a2rk313/ProjectNocturna.git
   cd ProjectNocturna
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your configuration:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # API Keys
   LIGHT_POLLUTION_API_KEY=your_light_pollution_api_key
   MAPBOX_TOKEN=your_mapbox_token
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000` in your browser.
