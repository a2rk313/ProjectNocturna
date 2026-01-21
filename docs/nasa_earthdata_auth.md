# NASA Earthdata Authentication Implementation

## Overview
This document explains the implementation of NASA Earthdata authentication in Project Nocturna's VIIRS data ingestion pipeline.

## Problem Statement
NASA Earthdata requires authentication for accessing data files. The original implementation had issues with the authentication mechanism, resulting in "proceeding without authentication" messages even when credentials were provided.

## Solution Approach
The solution implements a proper NASA Earthdata Login authentication system using:

1. **Basic Authentication**: Uses HTTP Basic Auth with NASA Earthdata credentials
2. **Proper Header Management**: Includes appropriate User-Agent and Accept headers
3. **Redirect Handling**: Properly follows redirects for the authentication flow
4. **Session Management**: Maintains authentication state across requests

## Key Components

### 1. Authentication Utility (`lib/nasa_auth.ts`)
```typescript
export class NasaEarthdataAuth
```

This singleton class provides:
- Authentication testing
- Secure credential handling
- Proper header generation
- File download capability with authentication

### 2. Updated VIIRS Pipeline
The `VIIRSDownloader` class now uses the new authentication utility for both:
- CMR (Common Metadata Repository) searches
- Actual data file downloads

## Usage

### Environment Variables
Set these in your `.env` file:
```bash
NASA_EARTHDATA_USERNAME=your_nasa_username
NASA_EARTHDATA_PASSWORD=your_nasa_password
```

### Getting Credentials
1. Register at [NASA Earthdata Login](https://urs.earthdata.nasa.gov/)
2. Access the [Earthdata Search](https://search.earthdata.nasa.gov/) interface
3. Find your desired datasets (e.g., VIIRS Day/Night Band)
4. Use the same credentials for programmatic access

## Technical Details

### Authentication Flow
1. **Initial Request**: Makes request with Basic Auth headers
2. **Redirect Handling**: Follows redirects to Earthdata Login if needed
3. **Session Maintenance**: Reuses authentication tokens across requests
4. **Error Handling**: Graceful degradation when auth fails

### Headers Used
- `User-Agent`: Identified as "ProjectNocturna/2.0"
- `Authorization`: Basic auth with Base64-encoded credentials
- `Accept`: Accepts all content types for downloads

## Security Considerations
- Credentials are stored in environment variables
- No plaintext passwords in code
- Secure transmission over HTTPS
- Session-based authentication

## Troubleshooting

### Common Issues
1. **"Proceeding without authentication"**: Check environment variables
2. **401 Unauthorized**: Verify credentials are correct
3. **403 Forbidden**: Account may need specific dataset permissions
4. **Redirect loops**: May indicate incorrect authentication setup

### Testing
Run the download script to test authentication:
```bash
bun run scripts/download_viirs.ts
```

## Future Enhancements
- Token-based authentication (OAuth2)
- Cookie jar management for session persistence
- Certificate pinning for enhanced security
- Integration with NASA's EDL API for token refresh