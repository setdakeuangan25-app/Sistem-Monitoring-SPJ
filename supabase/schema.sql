-- Sistem Monitoring SPJ - Setda Kobar
-- Jalankan seluruh file ini di Supabase: SQL Editor -> New query -> Run.

create extension if not exists pgcrypto;

-- ============ TABEL ============
create table if not exists public.spj (
  id uuid primary key default gen_random_uuid(),
  no text,
  bagian text not null check (bagian in (
    'UMUM','PEMBANGUNAN','KESRA','EKONOMI','HUKUM','PBJ','ORGANISASI','PEMERINTAHAN','PROKOM'
  )),
  kategori text not null,
  uraian text not null,
  status text check (status in ('ACC','REVISI')),  -- null = belum diproses
  total_nominal bigint not null default 0,
  tgl_masuk date,
  tgl_keluar date,
  tgl_berkas date,
  tgl_bayar date,
  ket text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spj_pegawai (
  id uuid primary key default gen_random_uuid(),
  spj_id uuid not null references public.spj(id) on delete cascade,
  urutan int not null default 0,
  nama text not null,
  nominal bigint not null default 0
);

create index if not exists idx_spj_bagian on public.spj(bagian);
create index if not exists idx_spj_status on public.spj(status);
create index if not exists idx_spj_created on public.spj(created_at desc);
create index if not exists idx_pegawai_spj on public.spj_pegawai(spj_id);

-- ============ updated_at otomatis ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_spj_updated_at on public.spj;
create trigger trg_spj_updated_at
before update on public.spj
for each row execute function public.set_updated_at();

-- ============ RLS: hanya user yang login ============
alter table public.spj enable row level security;
alter table public.spj_pegawai enable row level security;

drop policy if exists "authenticated full access spj" on public.spj;
create policy "authenticated full access spj"
  on public.spj for all to authenticated
  using (true) with check (true);

drop policy if exists "authenticated full access pegawai" on public.spj_pegawai;
create policy "authenticated full access pegawai"
  on public.spj_pegawai for all to authenticated
  using (true) with check (true);

-- ============ RPC: simpan SPJ + pegawai secara atomik ============
-- p_id null  -> insert SPJ baru
-- p_id terisi -> update SPJ, ganti seluruh daftar pegawai
-- total_nominal selalu dihitung dari jumlah nominal pegawai.
create or replace function public.save_spj(
  p_id uuid,
  p_spj jsonb,
  p_pegawai jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_total bigint;
begin
  if p_pegawai is null or jsonb_array_length(p_pegawai) = 0 then
    raise exception 'Minimal 1 pegawai';
  end if;

  select coalesce(sum(coalesce((e->>'nominal')::bigint, 0)), 0)
    into v_total
    from jsonb_array_elements(p_pegawai) as e;

  if p_id is null then
    insert into public.spj (
      no, bagian, kategori, uraian, status, total_nominal,
      tgl_masuk, tgl_keluar, tgl_berkas, tgl_bayar, ket
    ) values (
      nullif(p_spj->>'no', ''),
      p_spj->>'bagian',
      p_spj->>'kategori',
      p_spj->>'uraian',
      nullif(p_spj->>'status', ''),
      v_total,
      nullif(p_spj->>'tglMasuk', '')::date,
      nullif(p_spj->>'tglKeluar', '')::date,
      nullif(p_spj->>'tglBerkas', '')::date,
      nullif(p_spj->>'tglBayar', '')::date,
      nullif(p_spj->>'ket', '')
    ) returning id into v_id;
  else
    update public.spj set
      no = nullif(p_spj->>'no', ''),
      bagian = p_spj->>'bagian',
      kategori = p_spj->>'kategori',
      uraian = p_spj->>'uraian',
      status = nullif(p_spj->>'status', ''),
      total_nominal = v_total,
      tgl_masuk = nullif(p_spj->>'tglMasuk', '')::date,
      tgl_keluar = nullif(p_spj->>'tglKeluar', '')::date,
      tgl_berkas = nullif(p_spj->>'tglBerkas', '')::date,
      tgl_bayar = nullif(p_spj->>'tglBayar', '')::date,
      ket = nullif(p_spj->>'ket', '')
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'SPJ tidak ditemukan';
    end if;

    delete from public.spj_pegawai where spj_id = v_id;
  end if;

  insert into public.spj_pegawai (spj_id, urutan, nama, nominal)
  select
    v_id,
    (t.ord - 1)::int,
    t.e->>'nama',
    coalesce((t.e->>'nominal')::bigint, 0)
  from jsonb_array_elements(p_pegawai) with ordinality as t(e, ord);

  return v_id;
end $$;

grant execute on function public.save_spj(uuid, jsonb, jsonb) to authenticated;
