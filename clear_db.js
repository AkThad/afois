require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function clearData() {
    console.log('Clearing Opportunities...');

    // Delete all opportunities (cascade should handle the rest)
    // We use a condition that is always true
    const { error, count } = await supabase
        .from('opportunities')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything not equal to nil UUID (basically all)

    if (error) {
        console.error('Error clearing data:', error);
    } else {
        console.log(`Successfully deleted ${count} opportunities.`);
    }
}

clearData();
