// js/n8n-config.js - Browser-safe configuration
const N8N_CONFIG = {
    // Use relative paths that will be handled by our server
    // Note: We're now using our own chatbot implementation instead of n8n
    webhookUrl: '/api/chatbot',  // Updated to use our new chatbot endpoint
    actionBotUrl: '/api/chatbot',  // Updated to use our new chatbot endpoint
    timeout: 15000,
    fallbackEnabled: true
};

// Expose to Window for browser access
if (typeof window !== 'undefined') {
    window.N8N_CONFIG = N8N_CONFIG;
}

// Polyfill for timeout if not available
if (typeof AbortSignal !== 'undefined' && !AbortSignal.timeout) {
    AbortSignal.timeout = function(ms) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new Error("Timeout")), ms);
        return controller.signal;
    };
}