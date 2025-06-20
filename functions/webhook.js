const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function (event, context) {
  try {
    // Check if it's POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ reply: '❌ Method Not Allowed. Use POST' })
      };
    }

    // Try to parse JSON
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ reply: '❌ Invalid JSON format.' })
      };
    }

    const msg = body.message || 'no message';
    const phone = body.phone || 'unknown number';

    return {
      statusCode: 200,
      body: JSON.stringify({ "reply" : "✅ Got your message: ${msg} from ${phone}" })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: `❌ Server Error: ${error.message}` })
    };
  }
};
