import 'dotenv/config';

/**
 * NASA Earthdata Authentication Handler
 * Properly handles NASA's Earthdata Login authentication system
 */
export class NasaEarthdataAuth {
  private static instance: NasaEarthdataAuth;
  private sessionCookies: Map<string, string>;
  
  private constructor() {
    this.sessionCookies = new Map();
  }

  public static getInstance(): NasaEarthdataAuth {
    if (!NasaEarthdataAuth.instance) {
      NasaEarthdataAuth.instance = new NasaEarthdataAuth();
    }
    return NasaEarthdataAuth.instance;
  }

  /**
   * Authenticates with NASA Earthdata Login and returns session information
   */
  public async authenticate(): Promise<boolean> {
    const username = process.env.NASA_EARTHDATA_USERNAME;
    const password = process.env.NASA_EARTHDATA_PASSWORD;

    if (!username || !password) {
      console.warn('NASA Earthdata credentials not found in environment variables.');
      console.warn('Set NASA_EARTHDATA_USERNAME and NASA_EARTHDATA_PASSWORD to access data.');
      return false;
    }

    try {
      // First, we'll make a request to trigger the authentication flow
      // We'll use the CMR API as a test endpoint
      const cmrTestUrl = 'https://cmr.earthdata.nasa.gov/search/collections.json?short_name=VNP46A1&page_size=1';
      
      const response = await fetch(cmrTestUrl, {
        headers: {
          'User-Agent': 'ProjectNocturna/2.0',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });

      // Check if authentication was successful
      if (response.ok) {
        console.log('✅ NASA Earthdata authentication successful');
        return true;
      } else {
        console.warn(`❌ NASA Earthdata authentication failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error during NASA Earthdata authentication:', error);
      return false;
    }
  }

  /**
   * Fetches data from NASA endpoints with proper authentication
   */
  public async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const username = process.env.NASA_EARTHDATA_USERNAME;
    const password = process.env.NASA_EARTHDATA_PASSWORD;

    // Prepare headers with basic auth
    const headers = {
      'User-Agent': 'ProjectNocturna/2.0',
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      ...options.headers
    };

    // Make the request with authentication
    return await fetch(url, {
      ...options,
      headers,
      redirect: 'follow' // Important: follow redirects for the auth flow
    });
  }

  /**
   * Downloads a file from NASA Earthdata with proper authentication
   */
  public async downloadFile(url: string, destinationPath: string): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(url);
      
      if (!response.ok) {
        console.error(`Download failed with status ${response.status}: ${response.statusText}`);
        return false;
      }

      // Import fs here to avoid issues in environments without node filesystem
      const fs = await import('fs');
      const buffer = await response.arrayBuffer();
      
      fs.writeFileSync(destinationPath, Buffer.from(buffer));
      console.log(`✅ File downloaded successfully to ${destinationPath}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      return false;
    }
  }

  /**
   * Gets authenticated session headers for use with external tools like curl/wget
   */
  public getAuthHeaders(): Record<string, string> {
    const username = process.env.NASA_EARTHDATA_USERNAME;
    const password = process.env.NASA_EARTHDATA_PASSWORD;

    if (!username || !password) {
      return { 'User-Agent': 'ProjectNocturna/2.0' };
    }

    return {
      'User-Agent': 'ProjectNocturna/2.0',
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    };
  }
}

// Export a singleton instance
export const nasaAuth = NasaEarthdataAuth.getInstance();