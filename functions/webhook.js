const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
exports.handler = async function(event) {
  const parseUrlEncoded = (str) => {
    return str.split('&').reduce((acc, pair) => {
      const [rawK = '', rawV = ''] = pair.split('=');
      const k = decodeURIComponent(rawK);
      const v = decodeURIComponent((rawV || '').replace(/\+/g, ' '));
      acc[k] = v;
      return acc;
    }, {});
  };

  const makeReply = (msg) => ({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply: msg }),
  });

  if (event.httpMethod !== 'POST') {
    return makeReply('❌ Use POST request.');
  }

  const bodyStr = event.body || '';
  const form = parseUrlEncoded(bodyStr);

  const msg = form.message || '';
  const sender = form.sender || form.phone || 'someone';
  const contact = form.phone;

  return makeReply(`📨 Echo: "${msg}" from ${sender}`);
};
