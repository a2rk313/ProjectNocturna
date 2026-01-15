// js/layer-comparison.js
class LayerComparison {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.comparisonLayers = [];
        this.comparisonMode = false;
    }
    
    initialize() {
        console.log("🔍 Layer Comparison Tool initialized");
    }
    
    async compare(layerKeys, options = {}) {
        if (!Array.isArray(layerKeys) || layerKeys.length < 2) {
            console.error('Need at least 2 layers to compare');
            return;
        }
        
        this.comparisonMode = true;
        this.comparisonLayers = layerKeys;
        
        // Remove all existing comparison layers
        this.clearComparison();
        
        // Add comparison layers with adjusted opacity
        const opacity = options.opacity || 0.5;
        layerKeys.forEach(layerKey => {
            this.webGIS.addSpecialLayer(layerKey, { opacity });
        });
        
        // Show comparison interface
        this.showComparisonInterface(layerKeys, options);
    }
    
    showComparisonInterface(layerKeys, options) {
        const layersInfo = layerKeys.map(key => window.AppConfig.getLayerInfo(key));
        
        let content = `
            <div class="layer-comparison-interface">
                <h5><i class="fas fa-layer-group"></i> Layer Comparison Mode</h5>
                <p class="text-muted small">Comparing ${layerKeys.length} layers</p>
                
                <div class="row mb-3">
        `;
        
        layersInfo.forEach((info, index) => {
            content += `
                <div class="col-md-${12 / layerKeys.length}">
                    <div class="card bg-dark h-100">
                        <div class="card-body">
                            <h6>${info.name}</h6>
                            <p class="small">${info.description || 'No description'}</p>
                            <div class="layer-controls">
                                <label class="small">Opacity:</label>
                                <input type="range" class="form-range" min="0" max="100" value="50" 
                                       onchange="layerComparison.adjustLayerOpacity('${layerKeys[index]}', this.value/100)">
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-sm btn-outline-info" onclick="layerComparison.isolateLayer('${layerKeys[index]}')">
                                        <i class="fas fa-eye"></i> Isolate
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="layerComparison.removeFromComparison('${layerKeys[index]}')">
                                        <i class="fas fa-times"></i> Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        content += `
                </div>
                
                <div class="comparison-tools mt-3">
                    <h6><i class="fas fa-tools"></i> Analysis Tools</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-sm btn-cosmic-info" onclick="layerComparison.calculateDifference()">
                            <i class="fas fa-minus-circle"></i> Calculate Difference Map
                        </button>
                        <button class="btn btn-sm btn-cosmic-warning" onclick="layerComparison.correlationAnalysis()">
                            <i class="fas fa-chart-line"></i> Correlation Analysis
                        </button>
                        <button class="btn btn-sm btn-cosmic-success" onclick="layerComparison.exportComparison()">
                            <i class="fas fa-download"></i> Export Comparison Data
                        </button>
                    </div>
                </div>
                
                <div class="mt-3 text-end">
                    <button class="btn btn-sm btn-danger" onclick="layerComparison.endComparison()">
                        <i class="fas fa-times"></i> End Comparison
                    </button>
                </div>
            </div>
        `;
        
        window.SystemBus.emit('ui:show_modal', {
            title: "Layer Comparison",
            content: content,
            size: 'xl'
        });
    }
    
    adjustLayerOpacity(layerKey, opacity) {
        const layer = this.webGIS.activeSpecialLayers[layerKey];
        if (layer) {
            layer.setOpacity(opacity);
        }
    }
    
    isolateLayer(layerKey) {
        // Set this layer to full opacity, others to low opacity
        this.comparisonLayers.forEach(key => {
            const opacity = key === layerKey ? 0.8 : 0.2;
            this.adjustLayerOpacity(key, opacity);
        });
    }
    
    removeFromComparison(layerKey) {
        this.webGIS.removeSpecialLayer(layerKey);
        this.comparisonLayers = this.comparisonLayers.filter(key => key !== layerKey);
        
        if (this.comparisonLayers.length < 2) {
            this.endComparison();
        } else {
            this.showComparisonInterface(this.comparisonLayers);
        }
    }
    
    endComparison() {
        this.comparisonLayers.forEach(layerKey => {
            this.webGIS.removeSpecialLayer(layerKey);
        });
        
        this.comparisonLayers = [];
        this.comparisonMode = false;
        
        window.SystemBus.emit('system:message', 'Comparison mode ended');
        window.SystemBus.emit('ui:show_modal', { title: '', content: '', close: true });
    }
    
    async calculateDifference() {
        if (this.comparisonLayers.length !== 2) {
            window.SystemBus.emit('system:message', 'Need exactly 2 layers for difference calculation');
            return;
        }
        
        window.SystemBus.emit('system:message', 'Calculating layer difference...');
        
        // In a real implementation, this would fetch tile data and compute differences
        // For now, show a simulation
        
        const content = `
            <div class="difference-analysis">
                <h5><i class="fas fa-calculator"></i> Layer Difference Analysis</h5>
                <p>Calculating pixel-by-pixel difference between layers...</p>
                <div class="progress mb-3">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%"></div>
                </div>
                <div class="alert alert-info">
                    <h6><i class="fas fa-lightbulb"></i> Analysis Method</h6>
                    <p class="small mb-0">
                        <strong>Formula:</strong> Δ = |Layer₁ - Layer₂|<br>
                        <strong>Units:</strong> Radiance (nW/cm²/sr) or Sky Brightness (magnitudes/arcsec²)<br>
                        <strong>Purpose:</strong> Identify areas of significant change
                    </p>
                </div>
                <div class="mt-3">
                    <button class="btn btn-sm btn-primary" onclick="layerComparison.showDifferenceMap()">
                        <i class="fas fa-map"></i> Show Difference Map
                    </button>
                </div>
            </div>
        `;
        
        window.SystemBus.emit('ui:show_modal', {
            title: "Difference Analysis",
            content: content
        });
    }
    
    // ... other comparison methods ...
}

window.LayerComparison = LayerComparison;