// js/n8n-config.js
const N8N_CONFIG = {
    webhookUrl: 'http://localhost:5678/webhook/chatbot', // Replace with your actual n8n URL
    actionBotUrl: '',
    timeout: 10000, // 10 second timeout
    fallbackEnabled: true
};

// Add AbortSignal.timeout polyfill for older browsers
if (!AbortSignal.timeout) {
    AbortSignal.timeout = function(ms) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new Error("Timeout")), ms);
        return controller.signal;
    };
}