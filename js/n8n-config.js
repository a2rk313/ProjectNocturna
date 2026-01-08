// js/n8n-config.js - Browser-safe configuration
const N8N_CONFIG = {
    // Use relative paths that will be handled by our server
    webhookUrl: '/api/n8n/chatbot',
    actionBotUrl: '/api/n8n/actionbot',
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