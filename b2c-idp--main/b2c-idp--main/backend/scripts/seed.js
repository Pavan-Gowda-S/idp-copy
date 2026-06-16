const bcrypt = require('bcryptjs');
const store = require('../src/services/supabase.service');
const collections = require('../src/supabase/tables');
const { CONSTRUCTION_DOMAINS } = require('../src/utils/domains');
const paymentsService = require('../src/services/payments.service');

async function seed() {
  const email = 'builder@demo.in';
  let builder = await store.findOne(collections.builders, 'email', '==', email);
  if (!builder) {
    builder = await store.create(collections.builders, {
      name: 'Demo Builder',
      username: 'demo_builder',
      email,
      companyName: 'Greenwood Constructions Pvt Ltd',
      passwordHash: await bcrypt.hash('demo123456', 12),
      isActive: true
    });
  }

  const phone = '9876543210';
  let customerUser = await store.findOne(collections.users, 'phoneNumber', '==', phone);
  if (!customerUser) {
    const customer = await store.create(collections.customers, {
      name: 'Rajesh Kumar',
      phone,
      email: 'rajesh@example.in'
    });
    customerUser = await store.create(collections.users, {
      role: 'CUSTOMER',
      refId: customer._id,
      name: customer.name,
      phoneNumber: phone,
      phone,
      email: customer.email
    });
  }

  let project = await store.findOne(collections.projects, 'title', '==', 'Greenwood Villa Phase 1');
  if (!project) {
    project = await store.create(collections.projects, {
      code: 'GVILLA001',
      title: 'Greenwood Villa Phase 1',
      builder: builder._id,
      customer: customerUser.refId,
      address: 'Sector 62, Noida',
      status: 'Active',
      completionPercentage: 35,
      domains: CONSTRUCTION_DOMAINS.map((name) => ({
        name,
        status: name.includes('Foundation') ? 'In Progress' : 'Planned',
        completionPercentage: name.includes('Foundation') ? 60 : 0
      })),
      budget: 4500000,
      spentAmount: 1200000
    });
  }

  const mappingExists = await store.list(collections.userProjects, [['userId', '==', customerUser._id], ['projectId', '==', project._id]]);
  if (!mappingExists.length) {
    await store.create(collections.userProjects, {
      userId: customerUser._id,
      projectId: project._id
    });
  }

  let project2 = await store.findOne(collections.projects, 'title', '==', 'Skyline Apartments Tower B');
  if (!project2) {
    project2 = await store.create(collections.projects, {
      code: 'SKYAPT002',
      title: 'Skyline Apartments Tower B',
      builder: builder._id,
      customer: customerUser.refId,
      address: 'Gurugram Sector 57',
      status: 'Active',
      completionPercentage: 15,
      domains: CONSTRUCTION_DOMAINS.map((name) => ({ name, status: 'Planned', completionPercentage: 0 })),
      budget: 6200000,
      spentAmount: 450000
    });
    await store.create(collections.userProjects, {
      userId: customerUser._id,
      projectId: project2._id
    });
  }

  await paymentsService.seedDefaultMilestones(project._id);
  await paymentsService.seedDefaultMilestones(project2._id);

  await store.create(collections.changeOrders, {
    projectId: project._id,
    title: 'Italian Marble Upgrade – Kitchen',
    ...paymentsService.computeInrTotals(185000),
    status: 'Approved'
  });

  console.log('Seed complete');
  console.log('Builder email: builder@demo.in');
  console.log('Builder password: demo123456');
  console.log('Customer phone: 9876543210');
  console.log('Customer OTP (mock): 123456');
}

seed().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
