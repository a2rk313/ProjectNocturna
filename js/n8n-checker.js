// js/n8n-checker.js
class N8NChecker {
    static async checkServer() {
        // Use the server-side proxy instead of direct client connection
        try {
            const response = await fetch('/api/system/n8n-status');
            const data = await response.json();
            return data.online;
        } catch {
            return false;
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
                    <strong>⚠️ N8N Server Offline</strong>
                    <p class="mb-1">Advanced AI features require N8N server running on port 5678.</p>
                    <small class="text-muted">Run: <code>n8n start</code> in your terminal</small>
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
            alert('N8N server is still not responding. Please make sure it is running on port 5678.');
        }
    }
}

// Add this to your index.html after other scripts
document.addEventListener('DOMContentLoaded', function() {
    // Check N8N server after a delay to ensure everything is loaded
    setTimeout(async () => {
        if (window.webGIS && !window.webGIS.n8nAvailable) {
            N8NChecker.showWarning();
        }
    }, 3000);
});