create table if not exists public.job_tracker_data (
    user_id uuid primary key references auth.users (id) on delete cascade,
    data jsonb not null default '{"jobs":[],"trash":[]}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint job_tracker_data_shape check (
        jsonb_typeof(data) = 'object'
        and jsonb_typeof(data->'jobs') = 'array'
        and jsonb_typeof(data->'trash') = 'array'
    )
);

alter table public.job_tracker_data enable row level security;

create policy "Users can read their own job tracker data"
    on public.job_tracker_data for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can create their own job tracker data"
    on public.job_tracker_data for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own job tracker data"
    on public.job_tracker_data for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own job tracker data"
    on public.job_tracker_data for delete
    to authenticated
    using (auth.uid() = user_id);

grant select, insert, update, delete
    on public.job_tracker_data
    to authenticated;
