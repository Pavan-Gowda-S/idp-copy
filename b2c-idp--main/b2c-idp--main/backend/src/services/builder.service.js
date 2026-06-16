const store = require('./supabase.service');
const collections = require('../supabase/tables');

async function getBuilderCustomers(builderId) {
  const projects = await store.list(collections.projects, [['builder', '==', builderId]]);
  const seen = new Set();
  const customers = [];

  for (const project of projects) {
    const mappings = await store.list(collections.userProjects, [['projectId', '==', project._id]]);
    for (const mapping of mappings) {
      const user = await store.getById(collections.users, mapping.userId);
      if (!user || String(user.role).toUpperCase() !== 'CUSTOMER') continue;
      const key = `${user._id}:${project._id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      customers.push({
        userId: user._id,
        name: user.name || 'Customer',
        phoneNumber: user.phoneNumber || user.phone || '',
        projectId: project._id,
        projectCode: project.code,
        projectTitle: project.title
      });
    }

    if (project.customer) {
      const legacyCustomer = await store.getById(collections.customers, project.customer);
      if (legacyCustomer) {
        const key = `legacy:${legacyCustomer._id}:${project._id}`;
        if (!seen.has(key)) {
          seen.add(key);
          customers.push({
            userId: legacyCustomer._id,
            name: legacyCustomer.name || 'Customer',
            phoneNumber: legacyCustomer.phone || '',
            projectId: project._id,
            projectCode: project.code,
            projectTitle: project.title
          });
        }
      }
    }
  }

  return customers;
}

module.exports = { getBuilderCustomers };
