async function test() {
  const lat = 40.7128;
  const lon = -74.0060;

  console.log('Testing Spectral API...');
  const specRes = await fetch(`http://localhost:3000/api/science/spectral?lat=${lat}&lon=${lon}`);
  const specData = await specRes.json();
  console.log('Spectral Response:', JSON.stringify(specData, null, 2));

  console.log('\nTesting Policy Simulation API...');
  const policyRes = await fetch('http://localhost:3000/api/science/policy/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, policyId: 'shielding_v1' })
  });
  const policyData = await policyRes.json();
  console.log('Policy Response:', JSON.stringify(policyData, null, 2));
}

test();
