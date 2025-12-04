// js/utils.js - RELOAD SAFE
(function() {
    // Prevent redeclaration during hot reload
    if (window.Utils) {
        console.log('🛠️ Utils module already loaded, skipping.');
        return;
    }

    console.log('🛠️ Utils module loaded');

    const Utils = {
        // Generate a unique session ID
        generateId: () => 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2),

        // Safe JSON parse that doesn't crash app
        safeParse: (str) => {
            try {
                return JSON.parse(str);
            } catch (e) {
                return null;
            }
        },

        // Format numbers nicely (e.g. 1,234.56)
        formatNumber: (num, decimals = 2) => {
            return parseFloat(num).toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        },
        
        // Add delay for async operations
        delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
    };

    // Expose to window for global access
    window.Utils = Utils;
})();