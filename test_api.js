// Test script to verify API endpoints
const testEndpoints = async () => {
    console.log('Testing API endpoints...');
    
    // Test analyze-area endpoint
    try {
        const response = await fetch('/api/analyze-area', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [-74.0, 40.7],
                        [-74.0, 40.8],
                        [-73.9, 40.8],
                        [-73.9, 40.7],
                        [-74.0, 40.7]
                    ]]
                },
                type: "Polygon"
            })
        });
        
        const data = await response.json();
        console.log('analyze-area response:', data);
    } catch (error) {
        console.error('Error testing analyze-area:', error);
    }
    
    // Test spectral-analysis endpoint
    try {
        const response = await fetch('/api/spectral-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [-74.0, 40.7],
                        [-74.0, 40.8],
                        [-73.9, 40.8],
                        [-73.9, 40.7],
                        [-74.0, 40.7]
                    ]]
                }
            })
        });
        
        const data = await response.json();
        console.log('spectral-analysis response:', data);
    } catch (error) {
        console.error('Error testing spectral-analysis:', error);
    }
    
    // Test scotobiology-analysis endpoint
    try {
        const response = await fetch('/api/scotobiology-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [-74.0, 40.7],
                        [-74.0, 40.8],
                        [-73.9, 40.8],
                        [-73.9, 40.7],
                        [-74.0, 40.7]
                    ]]
                }
            })
        });
        
        const data = await response.json();
        console.log('scotobiology-analysis response:', data);
    } catch (error) {
        console.error('Error testing scotobiology-analysis:', error);
    }
    
    // Test energy-economics endpoint
    try {
        const response = await fetch('/api/energy-economics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [-74.0, 40.7],
                        [-74.0, 40.8],
                        [-73.9, 40.8],
                        [-73.9, 40.7],
                        [-74.0, 40.7]
                    ]]
                }
            })
        });
        
        const data = await response.json();
        console.log('energy-economics response:', data);
    } catch (error) {
        console.error('Error testing energy-economics:', error);
    }
    
    // Test multi-spectral endpoint
    try {
        const response = await fetch('/api/multi-spectral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [-74.0, 40.7],
                        [-74.0, 40.8],
                        [-73.9, 40.8],
                        [-73.9, 40.7],
                        [-74.0, 40.7]
                    ]]
                }
            })
        });
        
        const data = await response.json();
        console.log('multi-spectral response:', data);
    } catch (error) {
        console.error('Error testing multi-spectral:', error);
    }
};

console.log('Test script ready. Run testEndpoints() to test API endpoints.');