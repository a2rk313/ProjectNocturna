// js/n8n-checker.js
class N8NChecker {
    static async checkServer() {
        try {
            // Use relative path to check our own server's health instead of external N8N
            const response = await fetch('/api/health');
            return response.ok;
        } catch {
            try {
                // Fallback check for system status
                const response = await fetch('/api/system/status');
                return response.ok;
            } catch {
                return false;
            }
        }
    }
    
    static showWarning() {
        // Remove existing warning if any
        const existingWarning = document.querySelector('.n8n-warning');
        if (existingWarning) existingWarning.remove();
        
        const warning = document.createElement('div');
        warning.className = 'n8n-warning alert alert-warning position-fixed';
        warning.style.cssText = `
            top: 70px;
            right: 20px;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid #ffc107;
        `;
        warning.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="me-2">
                    <i class="fas fa-exclamation-triangle fa-lg text-warning"></i>
                </div>
                <div>
                    <strong>⚠️ Server Status Check</strong>
                    <p class="mb-1">Checking server connectivity and database connection.</p>
                    <small class="text-muted\">System health check</small>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-warning me-2" onclick="N8NChecker.retryConnection()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (warning.parentElement) {
                warning.remove();
            }
        }, 10000);
    }
    
    static async retryConnection() {
        const isConnected = await N8NChecker.checkServer();
        if (isConnected) {
            location.reload();
        } else {
            alert('Server is not responding. Please check that the application server is running.');
        }
    }
}

// Add this to your index.html after other scripts
document.addEventListener('DOMContentLoaded', function() {
    // Check server status after a delay to ensure everything is loaded
    setTimeout(async () => {
        if (window.webGIS && !window.webGIS.serverAvailable) {
            N8NChecker.showWarning();
        }
    }, 3000);
});