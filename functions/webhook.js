const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// TEMP guest state (reset every msg – ideally should store in DB or memory)
const sessions = {};

exports.handler = async function(event) {
  const parseForm = str => str.split('&').reduce((o,p)=>{const[k,v]=(p||'').split('=');o[decodeURIComponent(k)]=decodeURIComponent((v||'').replace(/\+/g,' '));return o;}, {});

  const form = parseForm(event.body || '');
  const msg = (form.message || '').toLowerCase();
  const sender = form.phone || form.sender;

  // Handle: "Is Bliss available on 28 June"
  const farmMatch = msg.match(/(Parth Farms|Aaditya Farms|Golf n Green Villa|retreat)/i);
  const dateMatch = msg.match(/(\d{1,2})[\/\- ]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\/\- ]?(\d{2,4})?/i);

  if (farmMatch && dateMatch) {
    const farmName = farmMatch[1];
    const day = dateMatch[1];
    const month = dateMatch[2];
    const year = dateMatch[3] || '2025';
    const checkIn = new Date(`${day} ${month} ${year} 12:00`).toISOString();
    const checkOut = new Date(`${day} ${month} ${year} 22:00`).toISOString();

    // 1. Fetch farm info
    const { data: farms } = await supabase
      .from('Properties')
      .select('*')
      .ilike('name', `%${farmName}%`);

    if (!farms || farms.length === 0) {
      return reply(`❌ No farm found with name "${farmName}"`);
    }

    const farm = farms[0];

    // 2. Check if already booked
    const { data: existing } = await supabase
      .from('Bookings')
      .select('*')
      .eq('farm_id', farm.id)
      .gte('check_in', checkIn)
      .lt('check_out', checkOut);

    if (existing.length > 0) {
      return reply(`😓 Sorry, ${farm.name} is already booked on ${day} ${month}.`);
    }

    // 3. Store session in temp (real app = use Redis/db)
    sessions[sender] = { farm_id: farm.id, farm_name: farm.name, check_in: checkIn, check_out: checkOut, base_price: farm.basePrice };

    return reply(`✅ ${farm.name} is available on ${day} ${month}!\n💰 Price: ₹${farm.base_price}\n\nWould you like to send an enquiry? Reply "Yes" to continue.`);
  }

  // 4. If user replies "Yes", collect details
  if (msg === 'yes' && sessions[sender]) {
    sessions[sender].step = 'ask_name';
    return reply(`Great! What's your full name?`);
  }

  // 5. Get guest name
  if (sessions[sender]?.step === 'ask_name') {
    sessions[sender].guest_name = form.message;
    sessions[sender].step = 'ask_contact';
    return reply(`📞 Please share your contact number`);
  }

  // 6. Get guest contact
  if (sessions[sender]?.step === 'ask_contact') {
    sessions[sender].guest_contact = form.message;
    sessions[sender].step = 'ask_guests';
    return reply(`👥 How many guests will be coming?`);
  }

  // 7. Get guest count
  if (sessions[sender]?.step === 'ask_guests') {
    sessions[sender].guest_count = form.message;
    sessions[sender].step = 'ask_purpose';
    return reply(`🎉 What's the purpose of your booking? (e.g. party, family event)`);
  }

  // 8. Get purpose and insert into bookings
  if (sessions[sender]?.step === 'ask_purpose') {
    sessions[sender].purpose = form.message;

    // Calculate follow-up time (3 hours later)
    const followUp = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('Bookings')
      .insert([{
        farm_id: sessions[sender].farm_id,
        check_in: sessions[sender].check_in,
        check_out: sessions[sender].check_out,
        guest_name: sessions[sender].guest_name,
        contact_number: sessions[sender].guest_contact,
        purpose: sessions[sender].purpose,
        number_of_guests: sessions[sender].guest_count,
        status: 'ENQUIRY',
        remark: 'Auto entry via WhatsApp',
        follow_up_time: followUp,
        price: sessions[sender].base_price
      }]);

    if (error) {
      return reply('❌ Something went wrong while logging your enquiry.');
    }

    // Fetch farm owner's number
    const { data: profiles } = await supabase
      .from('Profiles')
      .select('phone')
      .eq('farm_id', sessions[sender].farm_id)
      .limit(1);

    const ownerContact = profiles?.[0]?.phone || 'N/A';

    // Clear session
    delete sessions[sender];

    return reply(`🎉 Enquiry submitted successfully!\n📞 To confirm your booking, please contact the farm owner: ${ownerContact}`);
  }

  // Fallback
  return reply(`👋 Please type your farm name and date (e.g. Bliss 28 June)`);

  // Helper
  function reply(message) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: message })
    };
  }
};
