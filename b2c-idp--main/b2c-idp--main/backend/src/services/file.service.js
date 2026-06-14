const path = require('path');
const { getSupabase } = require('../supabase/client');
const env = require('../config/env');
const store = require('./supabase.service');
const collections = require('../supabase/tables');

function safeName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function uploadToSupabaseStorage(file, folder) {
  const ext = path.extname(file.originalname || '');
  const filename = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName(file.originalname || `upload${ext}`)}`;
  const supabase = getSupabase();

  // File bytes go to Supabase Storage; only metadata and public URL go to PostgreSQL.
  const { error } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw new Error(error.message || 'Supabase Storage upload failed');

  const { data } = supabase.storage
    .from(env.supabaseStorageBucket)
    .getPublicUrl(filename);

  return { filename, url: data.publicUrl };
}

exports.createAssets = async ({ files, project, uploadedBy, uploadedByModel, category, domain, description }) => {
  const folder = `projects/${project}/${category}`;
  return Promise.all((files || []).map(async (file) => {
    const stored = await uploadToSupabaseStorage(file, folder);
    return store.create(collections.files, {
      project,
      uploadedBy,
      uploadedByModel,
      category,
      domain: domain || '',
      originalName: file.originalname,
      filename: stored.filename,
      path: stored.filename,
      url: stored.url,
      mimeType: file.mimetype,
      size: file.size,
      description: description || ''
    });
  }));
};

