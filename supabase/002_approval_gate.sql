alter table public.profiles
  alter column status set default 'pending';

create index if not exists profiles_status_idx
  on public.profiles (status, created_at desc);
