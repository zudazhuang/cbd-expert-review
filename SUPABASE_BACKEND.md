# Supabase 后台接入说明

这个方案用于替代 CrudCrud 临时接口。专家仍扫描原二维码填写问卷，不需要任何配置。网站配置完成后，新提交的数据会优先写入 Supabase；旧 CrudCrud 数据仍可在后台合并显示，便于迁移过渡。

## 1. 创建项目

1. 打开 Supabase 官网并用 GitHub 登录。
2. New project，新建一个免费项目。
3. 等项目初始化完成。

## 2. 创建数据表

在 Supabase 项目中打开 SQL Editor，执行：

```sql
create extension if not exists "pgcrypto";

create table if not exists public.expert_review_submissions (
  id uuid primary key default gen_random_uuid(),
  d text default '',
  b jsonb not null default '{}'::jsonb,
  r text not null,
  s text default '',
  created_at timestamptz not null default now()
);

alter table public.expert_review_submissions enable row level security;

drop policy if exists "expert review anonymous insert" on public.expert_review_submissions;
create policy "expert review anonymous insert"
on public.expert_review_submissions
for insert
to anon
with check (
  jsonb_typeof(b) = 'object'
  and coalesce(b->>'v', '') <> ''
  and length(r) = 240
  and position('_' in r) = 0
);

drop policy if exists "expert review anonymous read" on public.expert_review_submissions;
create policy "expert review anonymous read"
on public.expert_review_submissions
for select
to anon
using (true);
```

## 3. 复制连接信息

在 Project Settings -> API 中复制：

- Project URL
- anon public key

然后交给 Codex，运行：

```powershell
python scripts/set_supabase_backend.py "https://你的项目.supabase.co" "你的-anon-key"
git add config.js app.js admin.js scripts/set_supabase_backend.py SUPABASE_BACKEND.md
git commit -m "Add Supabase backend support for expert review"
git push
```

## 4. 验证

1. 打开问卷提交一份测试数据。
2. 打开后台页面，确认能读取正式答卷。
3. 确认后再把 CrudCrud 中已有正式答卷导入 Supabase。
