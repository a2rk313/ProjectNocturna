class EventBus {
    constructor() {
        this.listeners = {};
        console.log('🎯 EventBus initialized');
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        console.log(`📡 Listener added for event: ${event}`);
    }

    emit(event, data) {
        console.log(`📤 Emitting event: ${event}`, data);
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in event listener for ${event}:`, error);
                }
            });
        } else {
            console.warn(`⚠️ No listeners for event: ${event}`);
        }
    }
}

// Attach to window so it is globally accessible
window.SystemBus = new EventBus();
console.log('✅ SystemBus attached to window');