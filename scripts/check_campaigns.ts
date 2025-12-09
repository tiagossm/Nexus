
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = 'https://hxbleqzpwwaqvpqkxhmq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4YmxlcXpwd3dhcXZwcWt4aG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTY5NTEsImV4cCI6MjA3OTI5Mjk1MX0.UY0hOdVxfgt8X3WsPuPQFB5y4wm30np2uxR2-df8bMg';

if (!supabaseUrl) {
    console.error('Missing SUPABASE URL');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCampaigns() {
    console.log('Fetching latest campaigns...');
    const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, custom_availability, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    data.forEach(c => {
        console.log(`\n-----------------------------------`);
        console.log(`Campaign: ${c.title} (${c.id})`);
        console.log(`Availability:`, JSON.stringify(c.custom_availability, null, 2));
    });
}

checkCampaigns();
