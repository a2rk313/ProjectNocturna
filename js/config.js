// js/config.js - Browser-safe configuration
class AppConfig {
    constructor() {
        this.isVercel = window.location.hostname.includes('vercel.app') || 
                       window.location.hostname.includes('onrender.com');
        this.isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
        
        // API endpoints
        this.apiBaseUrl = this.isVercel ? '' : '/api';
        
        // GeoServer configuration
        this.geoserverUrl = this.isLocalhost ? 'http://localhost:8080/geoserver' : 
                           this.isVercel ? 'https://your-vercel-app.vercel.app/geoserver-proxy' :
                           'http://localhost:8080/geoserver';
        
        this.init();
    }
    
    init() {
        console.log(`🌍 Environment: ${this.isVercel ? 'Vercel' : this.isLocalhost ? 'Local' : 'Production'}`);
        console.log(`📡 API Base URL: ${this.apiBaseUrl || '/api'}`);
        console.log(`🌍 GeoServer URL: ${this.geoserverUrl}`);
    }
    
    getApiUrl(endpoint) {
        // Remove leading slash if present in endpoint
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        
        if (this.isVercel) {
            // For Vercel, use relative path
            return `/${cleanEndpoint}`;
        } else {
            // For local, use /api/
            return `${this.apiBaseUrl}/${cleanEndpoint}`;
        }
    }
    
    getStaticUrl(path) {
        return path; // Static files are served from root
    }
    
    getGeoserverUrl() {
        return this.geoserverUrl;
    }
}

// Create global instance
window.AppConfig = new AppConfig();