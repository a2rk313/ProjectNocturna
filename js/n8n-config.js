// js/n8n-config.js
const N8N_CONFIG = {
    // 1. Point this to your N8N webhook URL (Standard Chat)
    webhookUrl: 'http://localhost:5678/webhook/chatbot', 
    
    // 2. Point this to the SAME URL (ActionBot Actions)
    // CRITICAL: This cannot be empty!
    actionBotUrl: 'http://localhost:5678/webhook/actionbot',
    
    timeout: 15000, 
    fallbackEnabled: true
};

// Polyfill for timeout (keep this)
if (!AbortSignal.timeout) {
    AbortSignal.timeout = function(ms) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new Error("Timeout")), ms);
        return controller.signal;
    };
}