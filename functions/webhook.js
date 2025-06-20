const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function(event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    const message = body.message || '';
    const sender = body.sender || '';
    const phone = body.phone || '';

    // Echo response for test
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: `📩 Echo: "${message}" from ${phone}` }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: `❌ Error: ${err.message}` })
    };
  }
};
