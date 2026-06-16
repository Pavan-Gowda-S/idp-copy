-- Indian Construction SaaS Platform - Supabase SQL setup
-- Paste this complete file into Supabase Dashboard > SQL Editor > New query > Run.

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Legacy builder credentials (password / OAuth profile storage)
create table if not exists builders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  email text unique,
  phone text,
  company_name text,
  password_hash text,
  google_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Legacy customer profile records (linked via users + user_projects)
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  project_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Central multi-tenant users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone_number text,
  role text not null check (role in ('BUILDER', 'CUSTOMER')),
  name text,
  password_hash text,
  ref_id uuid,
  username text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_phone_number on users(phone_number);
create index if not exists idx_users_role on users(role);

-- Property profiles linked to a builder account
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title text not null default 'Construction Project',
  description text,
  builder uuid not null references builders(id) on delete cascade,
  customer uuid references customers(id) on delete set null,
  address text,
  start_date text,
  target_completion_date text,
  status text not null default 'Active',
  completion_percentage integer not null default 0,
  domains jsonb not null default '[]'::jsonb,
  budget numeric not null default 0,
  spent_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customer portfolio: one phone number → many properties
create table if not exists user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, project_id)
);

create index if not exists idx_user_projects_user on user_projects(user_id);
create index if not exists idx_user_projects_project on user_projects(project_id);

-- Service complaints / ticketing
create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  category text not null check (category in ('Structural', 'Plumbing', 'Electrical', 'Finishing')),
  description text not null,
  urgency text not null check (urgency in ('Critical', 'Major', 'Minor')),
  status text not null default 'Submitted' check (status in ('Submitted', 'In Progress', 'Resolved_Pending', 'Closed')),
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_complaints_project on complaints(project_id);
create index if not exists idx_complaints_status on complaints(status);

-- Milestone billing & escrow ledger (INR)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_name text not null,
  base_amount numeric not null default 0,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  total_amount_inr numeric not null default 0,
  status text not null default 'Upcoming' check (status in ('Paid', 'Due Now', 'Upcoming')),
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_project on invoices(project_id);

-- Approved upgrade change orders (payments UI)
create table if not exists change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  base_amount numeric not null default 0,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  total_amount_inr numeric not null default 0,
  status text not null default 'Approved' check (status in ('Approved', 'Pending', 'Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_change_orders_project on change_orders(project_id);

-- Mock OTP store for customer phone auth (development / staging)
create table if not exists otp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  otp_code text not null,
  expires_at timestamptz not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_sessions_phone on otp_sessions(phone_number);

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  uploaded_by uuid,
  uploaded_by_model text,
  category text not null,
  domain text,
  original_name text,
  filename text not null,
  path text not null,
  url text not null,
  mime_type text,
  size bigint,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists progress_updates (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  builder uuid not null references builders(id) on delete cascade,
  domain text not null,
  date text not null,
  description text not null,
  dpr_status text not null default 'Doing',
  workers integer not null default 0,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimations (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  builder uuid not null references builders(id) on delete cascade,
  domain text not null,
  amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  customer uuid not null references customers(id) on delete cascade,
  work_date text,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  builder uuid not null references builders(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'Pending',
  due_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient uuid,
  recipient_model text not null,
  project uuid references projects(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  builder uuid not null references builders(id) on delete cascade,
  customer uuid not null references customers(id) on delete cascade,
  title text not null,
  domain text,
  description text not null,
  type text not null default 'Design',
  status text not null default 'Pending',
  customer_comment text,
  decided_at timestamptz,
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  builder uuid references builders(id) on delete set null,
  title text not null,
  domain text,
  start_date text,
  end_date text,
  status text not null default 'Planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists delays (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  builder uuid not null references builders(id) on delete cascade,
  domain text not null,
  date text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  project uuid references projects(id) on delete cascade,
  actor uuid,
  actor_model text,
  type text not null,
  message text not null,
  date text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  project uuid not null references projects(id) on delete cascade,
  source_file uuid,
  type text not null,
  status text not null default 'queued',
  summary text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_builder on projects(builder);
create index if not exists idx_projects_customer on projects(customer);
create index if not exists idx_uploads_project_category on uploads(project, category);
create index if not exists idx_progress_project on progress_updates(project);
create index if not exists idx_feedback_project on feedback(project);
create index if not exists idx_tasks_project on tasks(project);
create index if not exists idx_notifications_recipient on notifications(recipient, recipient_model);
create index if not exists idx_approvals_project on approvals(project);
create index if not exists idx_schedules_project on schedules(project);
create index if not exists idx_activity_project on activity_logs(project);

drop trigger if exists builders_set_updated_at on builders;
create trigger builders_set_updated_at before update on builders for each row execute function set_updated_at();
drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at before update on customers for each row execute function set_updated_at();
drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at before update on users for each row execute function set_updated_at();
drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects for each row execute function set_updated_at();
drop trigger if exists user_projects_set_updated_at on user_projects;
create trigger user_projects_set_updated_at before update on user_projects for each row execute function set_updated_at();
drop trigger if exists complaints_set_updated_at on complaints;
create trigger complaints_set_updated_at before update on complaints for each row execute function set_updated_at();
drop trigger if exists invoices_set_updated_at on invoices;
create trigger invoices_set_updated_at before update on invoices for each row execute function set_updated_at();
drop trigger if exists change_orders_set_updated_at on change_orders;
create trigger change_orders_set_updated_at before update on change_orders for each row execute function set_updated_at();
drop trigger if exists uploads_set_updated_at on uploads;
create trigger uploads_set_updated_at before update on uploads for each row execute function set_updated_at();
drop trigger if exists progress_updates_set_updated_at on progress_updates;
create trigger progress_updates_set_updated_at before update on progress_updates for each row execute function set_updated_at();
drop trigger if exists estimations_set_updated_at on estimations;
create trigger estimations_set_updated_at before update on estimations for each row execute function set_updated_at();
drop trigger if exists feedback_set_updated_at on feedback;
create trigger feedback_set_updated_at before update on feedback for each row execute function set_updated_at();
drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at before update on tasks for each row execute function set_updated_at();
drop trigger if exists notifications_set_updated_at on notifications;
create trigger notifications_set_updated_at before update on notifications for each row execute function set_updated_at();
drop trigger if exists approvals_set_updated_at on approvals;
create trigger approvals_set_updated_at before update on approvals for each row execute function set_updated_at();
drop trigger if exists schedules_set_updated_at on schedules;
create trigger schedules_set_updated_at before update on schedules for each row execute function set_updated_at();
drop trigger if exists delays_set_updated_at on delays;
create trigger delays_set_updated_at before update on delays for each row execute function set_updated_at();
drop trigger if exists activity_logs_set_updated_at on activity_logs;
create trigger activity_logs_set_updated_at before update on activity_logs for each row execute function set_updated_at();
drop trigger if exists ai_reports_set_updated_at on ai_reports;
create trigger ai_reports_set_updated_at before update on ai_reports for each row execute function set_updated_at();

insert into storage.buckets (id, name, public)
values ('construction-uploads', 'construction-uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read construction uploads" on storage.objects;
create policy "Public read construction uploads"
on storage.objects for select
using (bucket_id = 'construction-uploads');

drop policy if exists "Service role manages construction uploads" on storage.objects;
create policy "Service role manages construction uploads"
on storage.objects for all
using (bucket_id = 'construction-uploads' and auth.role() = 'service_role')
with check (bucket_id = 'construction-uploads' and auth.role() = 'service_role');
