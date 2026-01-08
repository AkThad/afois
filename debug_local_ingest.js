const fetch = require('node-fetch');

async function testIngest() {
    try {
        console.log('Fetching http://localhost:3000/api/ingest/sam...');
        const res = await fetch('http://localhost:3000/api/ingest/sam');
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Full Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testIngest();
