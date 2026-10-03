create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id text primary key default 'main' check (id = 'main'),
    full_name text not null default 'Simon Veres Sianturi',
    headline text not null default '',
    location text not null default 'Indonesia',
    gpa text not null default '',
    university text not null default '',
    focus text not null default '',
    bio text not null default '',
    photo_url text not null default '',
    cv_url text not null default '',
    is_published boolean not null default true,
    updated_at timestamptz not null default now()
);

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'experiences', 'organizations', 'projects', 'gallery_items',
        'certificates', 'achievements', 'education', 'publications',
        'skills', 'social_links'
    ] loop
        execute format($sql$
            create table if not exists public.%I (
                id uuid primary key default gen_random_uuid(),
                title text not null,
                subtitle text not null default '',
                organization text not null default '',
                period text not null default '',
                description text not null default '',
                details jsonb not null default '[]'::jsonb,
                image_url text not null default '',
                link_url text not null default '',
                sort_order integer not null default 0,
                is_published boolean not null default true,
                created_at timestamptz not null default now(),
                updated_at timestamptz not null default now()
            )
        $sql$, table_name);
    end loop;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'profiles', 'experiences', 'organizations', 'projects', 'gallery_items',
        'certificates', 'achievements', 'education', 'publications',
        'skills', 'social_links'
    ] loop
        execute format('alter table public.%I enable row level security', table_name);
        execute format('drop trigger if exists set_updated_at on public.%I', table_name);
        execute format(
            'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
            table_name
        );
        execute format('drop policy if exists "Public can read published rows" on public.%I', table_name);
        execute format(
            'create policy "Public can read published rows" on public.%I for select using (is_published = true)',
            table_name
        );
        execute format('drop policy if exists "Admins can manage rows" on public.%I', table_name);
        execute format(
            'create policy "Admins can manage rows" on public.%I for all to authenticated using (true) with check (true)',
            table_name
        );
    end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

insert into public.profiles (id)
values ('main')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'portfolio-media',
    'portfolio-media',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view portfolio media" on storage.objects;
create policy "Public can view portfolio media"
on storage.objects for select
using (bucket_id = 'portfolio-media');

drop policy if exists "Admins can upload portfolio media" on storage.objects;
create policy "Admins can upload portfolio media"
on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-media');

drop policy if exists "Admins can update portfolio media" on storage.objects;
create policy "Admins can update portfolio media"
on storage.objects for update to authenticated
using (bucket_id = 'portfolio-media')
with check (bucket_id = 'portfolio-media');

drop policy if exists "Admins can delete portfolio media" on storage.objects;
create policy "Admins can delete portfolio media"
on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-media');