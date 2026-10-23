-- 高雄政見方塊地圖 — Supabase 資料表
-- 在 Supabase Dashboard → SQL Editor 貼上執行一次即可。

create table if not exists public.policies (
  id           uuid primary key default gen_random_uuid(),
  districts    text[] not null,            -- 例：{'左營區'}；區域用 _north _east _core _port，全市用 _city
  category     text   not null default '生活',
  title        text   not null,
  body         text   not null default '',
  source_name  text   not null default '',
  source_url   text   not null default '',
  source_date  text   not null default '',
  display      text   not null default 'full' check (display in ('full','link')), -- full=直接顯示內容；link=只顯示標題與新聞連結
  kind         text   not null default 'news' check (kind in ('official','news','other')),
  published    boolean not null default true,
  sort         int    not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists policies_districts_idx on public.policies using gin (districts);

-- 管理員名單：只有這裡的 email 登入後能新增／修改／刪除
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists policies_touch on public.policies;
create trigger policies_touch before update on public.policies
  for each row execute function public.touch_updated_at();

alter table public.policies enable row level security;
alter table public.admins   enable row level security;

drop policy if exists "公開讀取已發布" on public.policies;
create policy "公開讀取已發布" on public.policies for select
  using (published or public.is_admin());

drop policy if exists "管理員寫入" on public.policies;
create policy "管理員寫入" on public.policies for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "管理員查自己" on public.admins;
create policy "管理員查自己" on public.admins for select
  using (email = lower(auth.jwt() ->> 'email'));

-- 把下面的 email 換成你自己的，再執行：
-- insert into public.admins (email) values ('you@example.com');
