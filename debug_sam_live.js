require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Hardcoded from constants or logic
const TARGET_NAICS = ['236220', '541614', '332311']; // Matches lib/ingest/constants.ts
const apiKey = process.env.SAM_API_KEY;

async function debugSam() {
    console.log('--- Debugging SAM Live ---');
    if (!apiKey) {
        console.error('No API Key');
        return;
    }

    // Date Format: MM/dd/yyyy
    const today = new Date();
    const lookback = new Date();
    lookback.setDate(today.getDate() - 365); // Check last year to catch the Apr 2025 op

    const formatDate = (d) => {
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [month, day, year].join('/');
    };

    const postedFrom = formatDate(lookback);
    const postedTo = formatDate(today);

    console.log(`Date Range: ${postedFrom} to ${postedTo}`);

    // Test first NAICS
    const naics = TARGET_NAICS[0]; // 541511
    const url = `https://api.sam.gov/prod/opportunities/v2/search?api_key=${apiKey}&postedFrom=${postedFrom}&postedTo=${postedTo}&limit=10&ncode=${naics}`;

    console.log(`Fetching: ${url.replace(apiKey, 'HIDDEN')}`);

    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);

        if (!res.ok) {
            console.log('Error Body:', await res.text());
            return;
        }

        const data = await res.json();
        console.log('Total Opportunities in Response:', data.opportunities ? data.opportunities.length : 0);

        if (data.opportunities && data.opportunities.length > 0) {
            console.log('First Opportunity Title:', data.opportunities[0].subject);
            console.log('First OA Type:', data.opportunities[0].type);
            console.log('First Set Aside:', data.opportunities[0].typeOfSetAside);
            console.log('First Place:', JSON.stringify(data.opportunities[0].placeOfPerformance));
        }

    } catch (e) {
        console.error('Fetch Failed:', e);
    }
}

debugSam();
