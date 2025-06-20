const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (will use Netlify env vars)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const body = JSON.parse(event.body);
  const { sender, message } = body;

  // For now, just echo back what you sent
  return {
    statusCode: 200,
    body: JSON.stringify({ reply: `📩 You said: "${message}"` }),
  };
};
