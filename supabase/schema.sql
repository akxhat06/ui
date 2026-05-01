                                                                                                                                                                                                                     
  -- =====================================================================                                                                                                                                           
  --  ATS Tracker — Supabase schema                                                                                                                                                                                  
  --  Run in: Supabase → SQL Editor                                                                                                                                                                                  
  --  Idempotent: safe to re-run on an existing project                                                                                                                                                              
  -- =====================================================================                                                                                                                                           
                                                                                                                                                                                                                     
  -- ---------------------------------------------------------------------                                                                                                                                           
  -- 1. profiles table
  -- ---------------------------------------------------------------------                                                                                                                                           
  create table if not exists public.profiles (
    id              uuid references auth.users on delete cascade primary key,
    full_name       text,                                                                                                                                                                                            
    location        text,
    experience      numeric,                                                                                                                                                                                         
    tech_stacks     text[],                                                                                                                                                                                          
    resume_path     text,
    resume_filename text,                                                                                                                                                                                            
    resume_summary  text,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()                                                                                                                                                                        
  );
                                                                                                                                                                                                                     
  -- Add columns if the table existed from an earlier version                                                                                                                                                        
  alter table public.profiles add column if not exists location        text;
  alter table public.profiles add column if not exists full_name       text;                                                                                                                                         
  alter table public.profiles add column if not exists experience      numeric;                                                                                                                                      
  alter table public.profiles add column if not exists tech_stacks     text[];
  alter table public.profiles add column if not exists resume_path     text;                                                                                                                                         
  alter table public.profiles add column if not exists resume_filename text;
  alter table public.profiles add column if not exists resume_summary  text;                                                                                                                                         
  alter table public.profiles add column if not exists created_at      timestamptz default now();                                                                                                                    
  alter table public.profiles add column if not exists updated_at      timestamptz default now();
                                                                                                                                                                                                                     
  -- ---------------------------------------------------------------------
  -- 2. Row-level security on profiles                                                                                                                                                                               
  -- ---------------------------------------------------------------------
  alter table public.profiles enable row level security;                                                                                                                                                             
  
  drop policy if exists "select own profile" on public.profiles;                                                                                                                                                     
  drop policy if exists "insert own profile" on public.profiles;
  drop policy if exists "update own profile" on public.profiles;                                                                                                                                                     
  
  create policy "select own profile" on public.profiles                                                                                                                                                              
    for select using (auth.uid() = id);
                                                                                                                                                                                                                     
  create policy "insert own profile" on public.profiles
    for insert with check (auth.uid() = id);                                                                                                                                                                         
                  
  create policy "update own profile" on public.profiles                                                                                                                                                              
    for update using (auth.uid() = id);
                                                                                                                                                                                                                     
  -- ---------------------------------------------------------------------
  -- 3. Auto-create a profile row when a new user signs up
  -- ---------------------------------------------------------------------                                                                                                                                           
  create or replace function public.handle_new_user()
  returns trigger                                                                                                                                                                                                    
  language plpgsql
  security definer
  set search_path = public
  as $$                                                                                                                                                                                                              
  begin
    insert into public.profiles (id)                                                                                                                                                                                 
    values (new.id)
    on conflict (id) do nothing;
    return new;
  end;
  $$;
                                                                                                                                                                                                                     
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created                                                                                                                                                                                
    after insert on auth.users
    for each row execute function public.handle_new_user();
                                                                                                                                                                                                                     
  -- ---------------------------------------------------------------------
  -- 4. Keep updated_at in sync                                                                                                                                                                                      
  -- ---------------------------------------------------------------------
  create or replace function public.touch_updated_at()                                                                                                                                                               
  returns trigger
  language plpgsql                                                                                                                                                                                                   
  as $$           
  begin
    new.updated_at := now();
    return new;
  end;                                                                                                                                                                                                               
  $$;
                                                                                                                                                                                                                     
  drop trigger if exists profiles_touch_updated_at on public.profiles;
  create trigger profiles_touch_updated_at
    before update on public.profiles
    for each row execute function public.touch_updated_at();                                                                                                                                                         
  
  -- ---------------------------------------------------------------------                                                                                                                                           
  -- 5. Storage bucket for resumes (private)
  -- ---------------------------------------------------------------------                                                                                                                                           
  insert into storage.buckets (id, name, public)
  values ('resumes', 'resumes', false)                                                                                                                                                                               
  on conflict (id) do nothing;                                                                                                                                                                                       
  
  -- Storage policies — each user can only touch files under their own folder                                                                                                                                        
  -- (we upload to: resumes/<auth.uid()>/<filename>)
  drop policy if exists "upload own resume" on storage.objects;                                                                                                                                                      
  drop policy if exists "view own resume"   on storage.objects;                                                                                                                                                      
  drop policy if exists "update own resume" on storage.objects;                                                                                                                                                      
  drop policy if exists "delete own resume" on storage.objects;                                                                                                                                                      
                                                                                                                                                                                                                     
  create policy "upload own resume" on storage.objects
    for insert to authenticated                                                                                                                                                                                      
    with check (                                                                                                                                                                                                     
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text                                                                                                                                                           
    );            

  create policy "view own resume" on storage.objects                                                                                                                                                                 
    for select to authenticated
    using (                                                                                                                                                                                                          
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text
    );                                                                                                                                                                                                               
  
  create policy "update own resume" on storage.objects                                                                                                                                                               
    for update to authenticated
    using (
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text
    );                                                                                                                                                                                                               
  
  create policy "delete own resume" on storage.objects                                                                                                                                                               
    for delete to authenticated
    using (
      bucket_id = 'resumes'
      and (storage.foldername(name))[1] = auth.uid()::text
    );                                                                                                                                                                                                               
  
  -- ---------------------------------------------------------------------                                                                                                                                           
  -- 6. Backfill: create profile rows for any auth.users that exist already
  -- ---------------------------------------------------------------------                                                                                                                                           
  insert into public.profiles (id)
  select id from auth.users                                                                                                                                                                                          
  on conflict (id) do nothing;
                                                                                                                                                                                                                     
  -- ---------------------------------------------------------------------
  -- Done.
  -- After running:                                                                                                                                                                                                  
  --   - Authentication → Providers → Email is enabled
  --   - (optional, dev) turn off "Confirm email" so new accounts can log in immediately                                                                                                                             
  -- ---------------------------------------------------------------------    