
const BASE_URL = 'http://localhost:3000';

async function testApi(name: string, endpoint: string, method: string = 'GET', body?: unknown) {
    console.log(`\nTesting ${name}...`);
    try {
        const url = `${BASE_URL}${endpoint}`;
        const opts: RequestInit = { method };
        if (body) {
            opts.body = JSON.stringify(body);
            opts.headers = { 'Content-Type': 'application/json' };
        }

        const res = await fetch(url, opts);
        const data = await res.json();

        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log('Response:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
        } else {
            console.error('Error:', data);
        }
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

async function testScienceApiMain() {
    // 1. Test Trends (POST)
    await testApi('Trends Analysis', '/api/science/trends', 'POST', {
        lat: 51.5074, lon: -0.1278, // London
        series: [{ year: 2020, value: 50 }, { year: 2021, value: 52 }, { year: 2022, value: 55 }]
    });

    // 2. Test Impact (POST)
    // Note: Depends on biodiversity_hotspots table being empty or populated. 
    // It should handle empty gracefully.
    await testApi('Ecological Impact', '/api/science/impact', 'POST', {
        lat: 51.5074, lon: -0.1278
    });

    // 3. Test Correlation (GET)
    await testApi('Satellite Correlation', '/api/science/correlation?lat=51.5074&lon=-0.1278&radius=10');
}

testScienceApiMain();
