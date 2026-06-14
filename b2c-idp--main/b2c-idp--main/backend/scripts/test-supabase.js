const store = require('../src/services/supabase.service');
const tables = require('../src/supabase/tables');

async function testSupabase() {
  const doc = await store.create(tables.notifications, {
    recipient: '00000000-0000-0000-0000-000000000000',
    recipientModel: 'Builder',
    title: 'Supabase test',
    message: 'PostgreSQL write/read test completed.',
    type: 'info'
  });
  const loaded = await store.getById(tables.notifications, doc._id);
  console.log('Supabase connection OK. Test document id:', loaded._id);
}

testSupabase().catch((error) => {
  console.error('Supabase test failed:', error.message);
  process.exit(1);
});
