const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function(event) {
  const parseForm = str => str.split('&').reduce((o,p)=>([k,v]=p.split('='),o[decodeURIComponent(k)]=decodeURIComponent((v||'').replace(/\+/g,' ')),o), {});

  const form = parseForm(event.body || '');
  const msg = (form.message || '').toLowerCase();
  const sender = form.sender || form.phone;

  // Step 1: Intent detection for availability
  if (/available|vacant|free/.test(msg)) {
    await supabase; // ensure client ready
    return { statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reply: '👋 Sure! Please send the farm name and date (e.g. Bliss 28 June)' }) };
  }

  // Step 2: User replies with Farm & Date
  const parts = msg.split(' ');
  if (parts.length >= 3) {
    const farmName = parts[0];
    const dateStr = parts.slice(1).join(' ');
    // Convert and validate date ...
    // Query Supabase for availability ...
    // Reply with “available” + price or “booked”
  }

  // Fallback
  return { statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reply: 'Sorry, I didn’t catch that. Ask “Is [FarmName] available on [Date]?”' }) };
};
