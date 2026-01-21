# Project Nocturna — AI-Optimized Architecture & Compliance Report

## Project Overview

- **Project Name**: Project Nocturna  
- **Proposed Stack**: Modern AI-Native WebGIS (Next.js + Supabase + GeoServer)  
- **Original Repository**: `https://github.com/a2rk313/ProjectNocturna`  
- **Mission Statement**: A comprehensive WebGIS platform enabling citizens to discover dark sky sites and researchers to analyze light pollution trends using NASA datasets.

---

## AI-Optimized Technology Stack

This stack balances AI-friendly libraries with robust enterprise-grade geospatial tools (**GeoServer/PostGIS**) to meet strict scientific requirements.

### 1) Frontend Architecture (The “View”)

- **Framework**: **Next.js 14+ (App Router)**
  - *Why*: File-system routing (`app/**/page.tsx`) is easy for AI agents to navigate and modify safely.
- **Language**: **TypeScript**
  - *Why*: Enforces correct shapes for NASA data objects and GeoServer responses.
- **Styling**: **Tailwind CSS + shadcn/ui**
  - *Why*: Tailwind is highly AI-generatable; shadcn/ui accelerates accessible UI scaffolding.
- **Maps**: **React-Leaflet**
  - *Why*: Declarative layer/state management, including WMS overlays from GeoServer.

### 2) Backend Architecture (The “Brain”)

- **Runtime**: **Next.js Route Handlers / API Routes**
  - *Why*: Small isolated endpoints (e.g. `GET /api/viirs`) are easier to generate/debug.
- **Database Interaction**: **Supabase JS Client (typed)**
  - *Why*: Typed query builder patterns reduce raw SQL mistakes.
- **Validation**: **Zod**
  - *Why*: Schemas define runtime validation + inferred TypeScript types.

### 3) Geospatial Processing (The “Engine”)

- **Data Store**: **PostgreSQL + PostGIS** (containerized)
  - *Requirement Met*: **Data in PostGIS**
  - *Why*: Standard spatial DB; supports GIST indexes and geospatial ops (`ST_DWithin`, etc.).
- **Map Serving**: **GeoServer** (dockerized)
  - *Requirement Met*: **Mandatory GeoServer**
  - *AI Strategy*: Generate/maintain **SLD (Styled Layer Descriptor)** XML to style layers.

---

## Features & Implementation Plan

### User-Facing Features

#### 1) Dark Sky Discovery

- **Implementation**: React component with `useGeolocation`.
- **Example AI Prompt**: “Create a hook querying PostGIS for locations within 50km of the user using `ST_DWithin`.”

#### 2) Interactive Chatbot (“Lumina”)

- *Requirement Met*: **Chat Bot**
- **Implementation**: Context-aware bot integrated into the map interface.
- **Capabilities**:
  - **Context awareness**: Reads current map bounds to answer “How is the pollution here?”
  - **Navigation**: Executes commands like “Fly to the nearest dark sky park”
  - **Education**: Explains scientific terms (e.g., “Bortle Scale”) on demand

#### 3) Observation Planning

- **Implementation**: Server-side fetch to Weather/Moon APIs.
- **Output**: “Stargazing Score” based on cloud cover, moon phase, and light pollution levels.

---

## Unique Scientific Tools (Group Contributions)

*Requirement Met*: **Two new and unique tools from own group**.

### Tool 1: AI-Powered Predictive Modeling Engine

- **Purpose**: Forecast future light pollution trends using statistical regression.
- **Key features**:
  - **Trend prediction**: slope/R-squared from historical VIIRS data to forecast brightness 5 years out
  - **Energy waste forecasting**: converts predicted radiance into estimated wasted GWh + financial cost (USD)
  - **Automated policy recommendations**: outputs advice based on trend magnitude

### Tool 2: Policy Impact & Spectral Analysis Simulator

- **Purpose**: Simulation lab for testing regulations and analyzing light quality.
- **Key features**:
  - **What-if scenarios**: simulates policies (e.g., shielding ordinances, curfews)
  - **Spectral signature analysis**: radiance-to-temperature approximation to differentiate LED sources
  - **Scotobiology risk assessment**: maps biological risks (e.g., avian migration risk) based on simulated spectrum

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                 Frontend (Next.js)                      │
│   [React UI] [Chatbot] [Leaflet]                        │
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

---

## Requirement Compliance Appendix

### 1) Infrastructure: All Tools Included

- **GeoServer**: Runs in Docker on port `${GEOSERVER_PORT:-8080}` (default `8080`). Handles WMS requests for map layers.
- **PostGIS**: Runs in Docker using `postgis/postgis:15-3.3`. Stores measurement data and spatial geometries.

### 2) Unique Contributions: Two New Tools

- **Tool 1**: Predictive Modeling Engine — adds time-series forecasting + energy economics
- **Tool 2**: Policy Simulator — adds interactive what-if modeling + spectral analysis

### 3) Data in PostGIS

- **Verification target**: `light_measurements` with `GEOMETRY(Point, 4326)` and a GIST index (e.g., `idx_light_measurements_location`).

### 4) One Layer from GeoServer

- **Verification target**: Serve a GeoServer layer like **“VIIRS_Night_Lights_2023”** via WMS.
- **Mechanism**: Frontend requests WMS tiles from a GeoServer endpoint like:
  - `http://localhost:8080/geoserver/<workspace>/wms`
- **Styling**: SLD files (XML) generated/managed by the backend.

### 5) Chat Bot

- **Verification**: “Lumina” integrated into the map UI; interprets user prompts and triggers map actions (pan/zoom/layer toggle).

### 6) Fully Functional Service

- **Verification**:
  - **Data ingestion**: Scripts fetch real NASA data and persist it
  - **API**: Next.js routes handle requests securely
  - **Frontend**: Leaflet-based UI delivers the experience

