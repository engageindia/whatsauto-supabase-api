// 📦 WhatsAuto Booking Automation Full Logic with Supabase Integration
// 🌐 Uses application/x-www-form-urlencoded parsing (with improved error handling)

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sessions = {};

exports.handler = async function(event) {
  try {
    console.log("[EVENT] Incoming:", event);

    const parseForm = str => str.split('&').reduce((o, p) => {
      const [k = '', v = ''] = (p || '').split('=');
      try {
        o[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
      } catch (e) {
        console.error('[FORM PARSE ERROR]', e, k, v);
      }
      return o;
    }, {});

    const form = parseForm(event.body || '');
    console.log("[FORM DATA]", form);

    const msg = (form.message || '').toLowerCase();
    const sender = form.phone || form.sender || 'unknown';
    console.log(`[MESSAGE] From: ${sender} | Message: "${msg}"`);

    if (!msg || msg.length < 2) {
      return reply('❌ Empty message received. Please ask a question or provide a date.');
    }

    const farmNames = ['parth farms', 'aaditya farms', 'golf n green villa', 'sarhi trails resort'];
    const matchedFarm = farmNames.find(f => msg.includes(f.toLowerCase()));
    const dateMatch = msg.match(/(\d{1,2})[\/- ]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\/- ]?(\d{2,4})?/i);

    if (!sessions[sender]) sessions[sender] = { step: 'start' };

    if (sessions[sender].step === 'start') {
      if (!matchedFarm) {
        sessions[sender].step = 'awaiting_farm';
        return reply('🏡 Please enter the name of the farm you are enquiring about (e.g. Parth Farms, Aaditya Farms, Golf n Green Villa, Sarhi Trails Resort)');
      }
      sessions[sender].farm_name = matchedFarm;
      sessions[sender].step = 'awaiting_date';
      return reply('📅 Please enter the date you are checking availability for (e.g. 28 June)');
    }

    if (sessions[sender].step === 'awaiting_farm') {
      const farmProvided = farmNames.find(f => msg.includes(f.toLowerCase()));
      if (!farmProvided) return reply('❌ Invalid farm name. Please try again.');
      sessions[sender].farm_name = farmProvided;
      sessions[sender].step = 'awaiting_date';
      return reply('📅 Please enter the date you are checking availability for (e.g. 28 June)');
    }

    if (sessions[sender].step === 'awaiting_date') {
      if (!dateMatch) return reply('❌ Invalid date format. Please enter like "28 June"');
      try {
        const day = dateMatch[1];
        const month = dateMatch[2];
        const year = dateMatch[3] || '2025';
        const checkIn = new Date(`${day} ${month} ${year} 12:00`).toISOString();
        const checkOut = new Date(`${day} ${month} ${year} 22:00`).toISOString();

        const { data: farms, error: farmError } = await supabase
          .from('Properties')
          .select('*')
          .ilike('name', `%${sessions[sender].farm_name}%`);

        if (farmError) throw farmError;
        if (!farms || farms.length === 0) return reply(`❌ No farm found matching "${sessions[sender].farm_name}"`);

        const farm = farms[0];

        const { data: bookings, error: bookingError } = await supabase
          .from('Bookings')
          .select('*')
          .eq('farm_id', farm.id)
          .gte('check_in', checkIn)
          .lt('check_out', checkOut);

        if (bookingError) throw bookingError;

        if (bookings.length > 0) {
          delete sessions[sender];
          return reply(`😓 Sorry, ${farm.name} is already booked on ${day} ${month}.`);
        }

        sessions[sender] = {
          step: 'ask_name', farm_id: farm.id, farm_name: farm.name,
          check_in: checkIn, check_out: checkOut, base_price: farm.base_price
        };

        return reply(`✅ ${farm.name} is available on ${day} ${month}!
💰 Price: ₹${farm.base_price}
Would you like to book? Reply "Yes" to continue.`);
      } catch (err) {
        console.error("[ERROR] Availability Check:", err);
        return reply(`❌ Error during availability check.`);
      }
    }

    if (msg === 'yes' && sessions[sender]?.step === 'ask_name') {
      return reply(`Great! What's your full name?`);
    }

    if (sessions[sender]?.step === 'ask_name') {
      sessions[sender].guest_name = msg;
      sessions[sender].step = 'ask_contact';
      return reply(`📞 Please share your contact number`);
    }

    if (sessions[sender]?.step === 'ask_contact') {
      sessions[sender].guest_contact = msg;
      sessions[sender].step = 'ask_guests';
      return reply(`👥 How many guests will be attending?`);
    }

    if (sessions[sender]?.step === 'ask_guests') {
      sessions[sender].guest_count = msg;
      sessions[sender].step = 'ask_purpose';
      return reply(`🎯 What's the purpose of your visit?`);
    }

    if (sessions[sender]?.step === 'ask_purpose') {
      sessions[sender].purpose = msg;
      const followUpTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

      try {
        const entry = {
          farm_id: sessions[sender].farm_id,
          check_in: sessions[sender].check_in,
          check_out: sessions[sender].check_out,
          guest_name: sessions[sender].guest_name,
          guest_contact: sessions[sender].guest_contact,
          guests: sessions[sender].guest_count,
          purpose: sessions[sender].purpose,
          price: sessions[sender].base_price,
          status: 'ENQUIRY',
          follow_up_time: followUpTime,
          remark: 'Auto WhatsApp Entry'
        };

        const { error: insertError } = await supabase.from('Bookings').insert([entry]);
        if (insertError) throw insertError;

        const { data: owners } = await supabase
          .from('Profiles')
          .select('phone')
          .eq('farm_id', sessions[sender].farm_id)
          .limit(1);

        const clientPhone = owners?.[0]?.phone || 'N/A';
        delete sessions[sender];

        return reply(`🎉 Your enquiry is recorded!
📞 Please contact the owner to confirm payment: ${clientPhone}`);

      } catch (err) {
        console.error("[ERROR] Booking insert:", err);
        return reply('❌ Failed to record your enquiry.');
      }
    }

    return reply(`👋 Please type your farm name to begin.`);
  } catch (fatal) {
    console.error("[FATAL ERROR]", fatal);
    return reply("❌ Server crashed. Please try again later.");
  }
};

function reply(message) {
  console.log("[REPLY]", message);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply: message })
  };
}
