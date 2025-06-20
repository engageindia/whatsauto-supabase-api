const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function (event, context) {
  try {
    let body = {};

    // Gracefully parse incoming JSON
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reply: '❌ Invalid JSON sent to server.'
        })
      };
    }

    const message = body.message || 'no message received';
    const sender = body.sender || 'unknown sender';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reply: `📨 Echo: "${message}" from ${sender}`
      })
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reply: `❌ Server crashed: ${error.message}`
      })
    };
  }
};
