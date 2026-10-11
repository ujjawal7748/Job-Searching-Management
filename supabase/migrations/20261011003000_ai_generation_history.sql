create table if not exists public.ai_generation_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    kind text not null check (kind in ('resume-match', 'cover-letter')),
    title text not null check (length(title) between 1 and 300),
    result jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists ai_generation_history_user_kind_created_idx
    on public.ai_generation_history (user_id, kind, created_at desc);

alter table public.ai_generation_history enable row level security;

create policy "Users can read their own AI generation history"
    on public.ai_generation_history for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can create their own AI generation history"
    on public.ai_generation_history for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can delete their own AI generation history"
    on public.ai_generation_history for delete
    to authenticated
    using (auth.uid() = user_id);

grant select, insert, delete
    on public.ai_generation_history
    to authenticated;
