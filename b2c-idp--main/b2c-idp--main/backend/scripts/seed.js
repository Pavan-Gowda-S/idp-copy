const bcrypt = require('bcryptjs');
const store = require('../src/services/supabase.service');
const collections = require('../src/supabase/tables');
const { CONSTRUCTION_DOMAINS } = require('../src/utils/domains');

async function seed() {
  const username = 'demo_builder';
  let builder = await store.findOne(collections.builders, 'username', '==', username);
  if (!builder) {
    builder = await store.create(collections.builders, {
      name: 'Demo Builder',
      username,
      companyName: 'B2C Demo Construction',
      passwordHash: await bcrypt.hash('demo_builder_123456', 12),
      isActive: true
    });
  }

  const code = '9823456712';
  let customer = await store.findOne(collections.customers, 'projectCode', '==', code);
  if (!customer) {
    customer = await store.create(collections.customers, {
      name: 'Demo Customer',
      phone: code,
      projectCode: code
    });
  }

  let project = await store.findOne(collections.projects, 'code', '==', code);
  if (!project) {
    project = await store.create(collections.projects, {
      code,
      title: 'Demo Villa Construction',
      builder: builder._id,
      customer: customer._id,
      address: 'Demo Site',
      status: 'Active',
      completionPercentage: 0,
      domains: CONSTRUCTION_DOMAINS.map((name) => ({
        name,
        status: 'Planned',
        completionPercentage: 0
      })),
      budget: 0,
      spentAmount: 0
    });
  }

  console.log('Seed complete');
  console.log('Builder username: demo_builder');
  console.log('Builder password: demo_builder_123456');
  console.log('Customer project code: 9823456712');
}

seed().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
