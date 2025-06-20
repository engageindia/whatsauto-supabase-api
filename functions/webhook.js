const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  try {
    const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        body: `Missing Supabase credentials: URL=${supabaseUrl}, KEY=${supabaseKey ? '✔️' : '❌'}`
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let body = {};
try {
  body = JSON.parse(event.body);
} catch (e) {
  return {
    statusCode: 400,
    body: `❌ Invalid JSON input`
  };
}
    const { sender, message } = body;

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: `📩 You said: "${message}"` }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: `Server error: ${err.message}`
    };
  }
};
