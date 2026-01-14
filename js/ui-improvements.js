// UI Improvements JavaScript - Addressing usability and accessibility concerns

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 UI Improvements loaded");
    
    // 1. Enhanced Loading States
    function showLoadingState(message = "Loading...") {
        // Create or update loading indicator
        let loader = document.getElementById('ui-loading-indicator');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'ui-loading-indicator';
            loader.innerHTML = `
                <div class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                     style="background: rgba(0,0,0,0.7); z-index: 9999; display: none;">
                    <div class="text-center text-white">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 mb-0">${message}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        }
        
        const indicator = loader.querySelector('.position-fixed');
        indicator.style.display = 'flex';
        indicator.querySelector('p').textContent = message;
    }
    
    function hideLoadingState() {
        const loader = document.getElementById('ui-loading-indicator');
        if (loader) {
            loader.querySelector('.position-fixed').style.display = 'none';
        }
    }
    
    // Expose to global scope
    window.showLoadingState = showLoadingState;
    window.hideLoadingState = hideLoadingState;
    
    // 2. Improved Error Messages
    function showError(message, duration = 5000) {
        // Remove any existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Create new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message position-fixed bg-danger text-white p-3 rounded shadow';
        errorDiv.style.cssText = `
            top: 20px; 
            right: 20px; 
            z-index: 10000; 
            min-width: 300px; 
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        errorDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div><i class="fas fa-exclamation-triangle me-2"></i>${message}</div>
                <button class="btn-close btn-close-white" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, duration);
        }
    }
    
    // 3. Improved Success Messages
    function showSuccess(message, duration = 3000) {
        // Remove any existing success messages
        const existingSuccess = document.querySelectorAll('.success-message');
        existingSuccess.forEach(success => success.remove());
        
        // Create new success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message position-fixed bg-success text-white p-3 rounded shadow';
        successDiv.style.cssText = `
            top: 20px; 
            right: 20px; 
            z-index: 10000; 
            min-width: 300px; 
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        successDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div><i class="fas fa-check-circle me-2"></i>${message}</div>
                <button class="btn-close btn-close-white" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (successDiv.parentElement) {
                    successDiv.remove();
                }
            }, duration);
        }
    }
    
    // Expose to global scope
    window.showError = showError;
    window.showSuccess = showSuccess;
    
    // 4. Enhanced User Feedback for Actions
    function showActionFeedback(element, action = 'click') {
        // Add visual feedback to the element
        element.style.transform = 'scale(0.95)';
        element.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.6)';
        
        // Reset after a short time
        setTimeout(() => {
            element.style.transform = '';
            element.style.boxShadow = '';
        }, 200);
    }
    
    // 5. Improved Mode Switching with Animation
    function enhanceModeSwitching() {
        const switchBtn = document.getElementById('switchMode');
        if (switchBtn) {
            switchBtn.addEventListener('click', function() {
                showLoadingState('Switching mode...');
                
                // Add animation class
                this.classList.add('btn-loading');
                
                // Remove animation class after a delay
                setTimeout(() => {
                    this.classList.remove('btn-loading');
                }, 1000);
            });
        }
    }
    
    // 6. Enhanced Tool Button Interactions
    function enhanceToolButtons() {
        const toolButtons = document.querySelectorAll('.control-panel .btn, .data-layers-panel .btn, .time-controls-panel .btn');
        
        toolButtons.forEach(button => {
            // Add ripple effect on click
            button.addEventListener('click', function(e) {
                showActionFeedback(this);
                
                // Add loading state if needed
                if (this.textContent.includes('Loading') || this.dataset.loading) {
                    this.classList.add('btn-loading');
                    setTimeout(() => {
                        this.classList.remove('btn-loading');
                    }, 1000);
                }
            });
            
            // Add hover effects
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        });
    }
    
    // 7. Improved Panel Collapsing with Animation
    function enhancePanelCollapsing() {
        const panelHeaders = document.querySelectorAll('.panel-header');
        
        panelHeaders.forEach(header => {
            header.addEventListener('click', function(e) {
                if (e.target.closest('.btn')) return;
                
                const panelBody = this.nextElementSibling;
                const panelContainer = this.closest('.cosmic-panel');
                const collapseIcon = this.querySelector('.collapse-icon');
                
                // Animate the collapse/expand
                if (panelContainer.classList.contains('panel-collapsed')) {
                    panelContainer.classList.remove('panel-collapsed');
                    if (collapseIcon) {
                        collapseIcon.classList.remove('fa-chevron-down');
                        collapseIcon.classList.add('fa-chevron-up');
                    }
                } else {
                    panelContainer.classList.add('panel-collapsed');
                    if (collapseIcon) {
                        collapseIcon.classList.remove('fa-chevron-up');
                        collapseIcon.classList.add('fa-chevron-down');
                    }
                }
            });
        });
    }
    
    // 8. Better Touch Targets for Mobile
    function improveTouchTargets() {
        // Ensure all buttons have adequate touch target size
        const buttons = document.querySelectorAll('button, .btn');
        
        buttons.forEach(button => {
            // Check if button is too small for mobile
            const computedStyle = window.getComputedStyle(button);
            const height = parseInt(computedStyle.height);
            const width = parseInt(computedStyle.width);
            
            // If button is smaller than recommended touch target (44px)
            if (height < 44 || width < 44) {
                button.style.minHeight = '44px';
                button.style.minWidth = '44px';
                button.style.padding = '12px';
            }
        });
    }
    
    // 9. Enhanced Keyboard Navigation
    function enhanceKeyboardNavigation() {
        // Add focus indicators for better keyboard navigation
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(element => {
            element.addEventListener('focus', function() {
                this.classList.add('focus-visible');
            });
            
            element.addEventListener('blur', function() {
                this.classList.remove('focus-visible');
            });
        });
    }
    
    // 10. Responsive Improvements
    function handleResponsiveChanges() {
        // Adjust UI elements based on screen size
        function adjustForScreenSize() {
            const width = window.innerWidth;
            
            if (width <= 768) {
                // Mobile-specific adjustments
                document.body.classList.add('mobile-view');
                
                // Adjust panel positions
                const controlPanel = document.querySelector('.control-panel');
                const dataLayersPanel = document.querySelector('.data-layers-panel');
                
                if (controlPanel) {
                    controlPanel.style.top = '70px';
                    controlPanel.style.width = 'calc(100% - 20px)';
                    controlPanel.style.left = '10px';
                }
                
                if (dataLayersPanel) {
                    dataLayersPanel.style.top = 'calc(70px + 320px)'; // Below control panel
                    dataLayersPanel.style.width = 'calc(100% - 20px)';
                    dataLayersPanel.style.left = '10px';
                }
            } else {
                document.body.classList.remove('mobile-view');
            }
        }
        
        // Initial adjustment
        adjustForScreenSize();
        
        // Listen for resize events
        window.addEventListener('resize', adjustForScreenSize);
    }
    
    // 11. Enhanced Zoom Controls
    function enhanceZoomControls() {
        // Make zoom controls more accessible
        const zoomControls = document.querySelector('.leaflet-control-zoom');
        if (zoomControls) {
            // Add ARIA labels for accessibility
            const zoomInBtn = zoomControls.querySelector('.leaflet-control-zoom-in');
            const zoomOutBtn = zoomControls.querySelector('.leaflet-control-zoom-out');
            
            if (zoomInBtn) {
                zoomInBtn.setAttribute('aria-label', 'Zoom in');
                zoomInBtn.setAttribute('title', 'Zoom in');
            }
            
            if (zoomOutBtn) {
                zoomOutBtn.setAttribute('aria-label', 'Zoom out');
                zoomOutBtn.setAttribute('title', 'Zoom out');
            }
        }
    }
    
    // 12. Initialize all improvements
    function initializeUIImprovements() {
        console.log("🔧 Initializing UI improvements...");
        
        enhanceModeSwitching();
        enhanceToolButtons();
        enhancePanelCollapsing();
        improveTouchTargets();
        enhanceKeyboardNavigation();
        handleResponsiveChanges();
        enhanceZoomControls();
        
        // Add CSS for focus states
        const style = document.createElement('style');
        style.textContent = `
            .focus-visible {
                outline: 2px solid var(--cosmic-primary) !important;
                outline-offset: 2px !important;
            }
            
            .btn-loading {
                position: relative;
                pointer-events: none;
            }
            
            .btn-loading::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                top: 50%;
                left: 50%;
                margin-left: -8px;
                margin-top: -8px;
                border: 2px solid transparent;
                border-top-color: #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        console.log("✅ UI improvements initialized");
    }
    
    // Run initialization after DOM is fully loaded
    initializeUIImprovements();
    
    // Enhance the SystemBus to provide better feedback
    if (window.SystemBus) {
        // Store original emit method
        const originalEmit = window.SystemBus.emit;
        
        // Override emit to provide better user feedback
        window.SystemBus.emit = function(event, data) {
            // Call original method
            originalEmit.call(this, event, data);
            
            // Provide visual feedback for system messages
            if (event === 'system:message') {
                // Show message in chat
                if (typeof window.webGIS !== 'undefined' && typeof window.webGIS.addChatMessage === 'function') {
                    window.webGIS.addChatMessage(data, 'assistant');
                }
            }
        };
    }
});

// Additional utility functions for UI enhancements
window.UIUtils = {
    // Debounce function for better performance
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Smooth scroll function
    smoothScrollTo: function(element, duration = 500) {
        const startingY = window.pageYOffset;
        const elementY = element.offsetTop - 100; // Account for fixed navbar
        const targetY = document.body.scrollHeight - elementY < window.innerHeight ? document.body.scrollHeight - window.innerHeight : elementY;
        const diff = targetY - startingY;
        let startTime = null;
        
        if (Math.abs(diff) < 1) return;
        
        function animateScroll(currentTime) {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = ease(timeElapsed, startingY, diff, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animateScroll);
        }
        
        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }
        
        requestAnimationFrame(animateScroll);
    }
};