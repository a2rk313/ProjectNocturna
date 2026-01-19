# Project Nocturna - AI-Optimized Dark Sky Explorer

This is the Next.js implementation of **Project Nocturna**, a comprehensive WebGIS platform enabling citizens to discover dark sky sites and researchers to analyze light pollution trends using NASA datasets.

## 🌌 Mission Statement

A comprehensive WebGIS platform enabling citizens to discover dark sky sites and researchers to analyze light pollution trends using NASA datasets.

## ⚡ AI-Optimized Technology Stack

This stack balances modern AI-friendly libraries with robust enterprise-grade geospatial tools to meet strict scientific requirements.

### 1. Frontend Architecture (The "View")
* **Framework:** **Next.js 14+ (App Router)**
* **Language:** **TypeScript**
* **Styling:** **Tailwind CSS + shadcn/ui**
* **Maps:** **React-Leaflet**

### 2. Backend Architecture (The "Brain")
* **Runtime:** **Next.js API Routes (Serverless)**
* **Database Interaction:** **Supabase JS Client (Typed)**
* **Validation:** **Zod**

### 3. Geospatial Processing (The "Engine")
* **Data Store:** **PostgreSQL + PostGIS** (Containerized)
* **Map Serving:** **GeoServer** (Dockerized)

## 🛠 Features & Implementation

### 🌟 User-Facing Features
#### 1. Dark Sky Discovery
Interactive map with certified dark sky sites around the world.

#### 2. Interactive Chatbot (Cosmic Guide)
Context-aware bot integrated into the map interface with capabilities for:
- Context awareness (reads current map bounds)
- Navigation commands
- Educational explanations

#### 3. Observation Planning
Server-side fetch to Weather/Moon APIs for "Stargazing Score".

### 🔬 Unique Scientific Tools (Group Contributions)
#### **Tool 1: AI-Powered Predictive Modeling Engine**
Forecasts future light pollution trends using statistical regression.

#### **Tool 2: Policy Impact & Spectral Analysis Simulator**
Simulation laboratory for testing regulations and analyzing light quality.

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Frontend (Next.js)                      │
│   [React UI] [Chatbot] [MapLibre/Leaflet]               │
└───────────────────────────┬─────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌───────────────────┐ ┌───────────┐ ┌───────────────────┐
│  Next.js API      │ │ GeoServer │ │ Predictive Engine │
│ (Auth/Validation) │ │  (Docker) │ │  (Node.js/AI)     │
└─────────┬─────────┘ └─────┬─────┘ └─────────┬─────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    ┌─────────────────────────────────────────────────┐
    │           PostgreSQL + PostGIS (Docker)         │
    │  [User Data] [Spatial Index] [VIIRS Vectors]    │
    └─────────────────────────────────────────────────┘
```

## ✅ Project Requirement Compliance

### 1. Infrastructure: All Tools Included
* **GeoServer:** Running in a Docker container on port 8080
* **PostGIS:** Running in a Docker container (image `postgis/postgis:15-3.3`)

### 2. Unique Contributions: Two New Tools
* **Tool 1:** **Predictive Modeling Engine** - Adds time-series forecasting and energy economics
* **Tool 2:** **Policy Simulator** - Adds interactive "what-if" modeling for legislative impact

### 3. Data in PostGIS
* The `light_measurements` table uses a `GEOMETRY(Point, 4326)` column with GIST index for spatial querying.

### 4. One Layer from GeoServer
* The application serves the **"VIIRS_Night_Lights_2023"** layer via WMS requests.

### 5. Chat Bot
* The **"Cosmic Guide"** is fully integrated with natural language processing.

### 6. Fully Functional Service
* Complete stack with data ingestion, secure API, and polished frontend interface.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

- `GET /api/viirs` - NASA VIIRS nighttime lights data
- `GET /api/darksky` - International Dark Sky Places registry
- `POST /api/predictive/engine` - AI-powered predictive modeling engine

## Learn More

This project demonstrates the integration of AI-optimized technologies with traditional geospatial tools to create a powerful environmental monitoring platform focused on light pollution research and dark sky preservation.
