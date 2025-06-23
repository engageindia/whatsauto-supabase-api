const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function(event) {
  const parseUrlEncoded = (str) => {
    return str
      .split('&')
      .map(pair => pair.split('='))
      .reduce((acc, [k, v]) => {
        acc[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
        return acc;
      }, {});
  };

  // Ensure correct response structure
  const makeReply = (msg) => ({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply: msg })
  });

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return makeReply('❌ Method not allowed — please use POST.');
  }

  // Parse form data (WhatsAuto default)
  const form = parseUrlEncoded(event.body || '');

  const msg = form.message || 'no message';
  const sender = form.sender || 'unknown';

  // ✅ Test echo response
  return makeReply(`📨 Echo: "${msg}" from ${sender}`);
};
