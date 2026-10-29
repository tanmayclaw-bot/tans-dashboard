-- Tan's Dashboard: schema + seed data (Supabase project: tans-library)
create table if not exists public.dashboard_items (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  url text not null,
  note text default '',
  badge text default '',
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.dashboard_items enable row level security;

drop policy if exists "tan only" on public.dashboard_items;
create policy "tan only" on public.dashboard_items
  for all to authenticated
  using (auth.uid() = '1dce8751-04fc-400e-a498-d72ee2904e7f')
  with check (auth.uid() = '1dce8751-04fc-400e-a498-d72ee2904e7f');

insert into public.dashboard_items (section, title, url, note, badge, sort) values
('Coming up', 'MahaDBT scholarship portal', 'https://mahadbt2.maharashtra.gov.in', 'Hard copy to the college office Fri 30 Oct. College deadline 31 Oct.', 'due 31 Oct', 10),
('Coming up', 'Seva First - CarpeDiem entry', 'https://www.register.sevainnovationchallenge.in/', 'Submitted 16 Oct. Results land on this portal dashboard.', 'results due', 20),
('Coming up', 'Sem 2 study tracker', 'https://docs.google.com/spreadsheets/d/164U9qrkZ7StM9Bwy5TIuFc5F_Cjtdz6GCNA2ya1GJqI/edit', 'Main exams start Mon 2 Nov. Countdown + per-subject progress.', 'exams 2 Nov', 30),
('Coming up', 'Anandi NEAT', 'https://drive.google.com/drive/folders/1ZiqjxAo-EjL-GXrgW93FniPR6grKyQ0Z', 'Test Sun 29 Nov. Daily 5-8 PM blocks on the calendar.', '29 Nov', 40),

('Anandi NEAT prep', 'Anandi NEAT Resources', 'https://drive.google.com/drive/folders/1ZiqjxAo-EjL-GXrgW93FniPR6grKyQ0Z', 'Master folder: index, Vedic Maths C1, Business Terms. Shared with Gaurang.', '', 110),
('Anandi NEAT prep', 'NEAT 3000 Practice', 'https://drive.google.com/drive/folders/1-u75nTncYyDgtABVILk0fkJ5BspSon8p', 'Generated practice sets plus the original samples archive.', '', 120),
('Anandi NEAT prep', 'NEAT 3000 - Index & Progress', 'https://docs.google.com/document/d/1X7Qo--cUDTt9BSJORR8odvlIshBvt274edtrJFE0OKw/edit', 'Set index and attempt tracking for the practice folder.', '', 130),
('Anandi NEAT prep', 'Original sample questions', 'https://docs.google.com/document/d/1ZLXmyF3udkrL2fWWOGlc0vzUQckq264jt87D6wmTzSo/edit', 'Anandi''s own Q1-Q3 with the expected worked key.', '', 140),
('Anandi NEAT prep', 'Mental Maths practice', 'https://docs.google.com/document/d/1RAeoVOhGvALwRRuzqIS-WThp04K5VMWQSTwH9fOP_TM/edit', 'Vedic Maths course, daily drills and score log.', '', 150),
('Anandi NEAT prep', 'Practice question bank (unofficial)', 'https://anandifellowship.app/practice', 'Free third-party question bank. Not affiliated with Anandi; quality unverified.', 'unofficial', 160),

('College - Sem 2', 'First Year - AI Workspace', 'https://drive.google.com/drive/folders/142NuCrlptPnBUcvYiuiwib_vh_Sy1JzR', 'Master Drive folder: subjects, assignments, exams.', '', 210),
('College - Sem 2', 'Assignment Tracker', 'https://docs.google.com/spreadsheets/d/1mRyh1VhzRi0eI4PAJSUhBFJyymoMpJaS1WNsVXJi4oI/edit', 'Due dates, days-left counter, solution links.', '', 220),
('College - Sem 2', 'Unit Test 1 - Prep Hub', 'https://docs.google.com/spreadsheets/d/1cbrQ823WlXWzVVKneR2o9oFw1bahJW5rgZvvxakcEuU/edit', 'Per-subject plans, practice papers, answer keys.', '', 230),
('College - Sem 2', 'PYQ - HQ Recreations', 'https://drive.google.com/drive/folders/1N7HhDvKNJAupiRIOkcdPiQfUbP4cC3ku', 'Clean retyped question papers, one folder per subject.', '', 240),
('College - Sem 2', 'Study Packs', 'https://drive.google.com/drive/folders/1WnX81tc_T1vtBDEYImJC8ucikWcmcBLn', 'Unit-wise PYQ analysis and notes for all 7 subjects.', '', 250),
('College - Sem 2', 'Shared PYQs (friends)', 'https://drive.google.com/drive/folders/1P_2Odfls1f5finGCHNyennhdTSR0h-Mb', 'Frozen snapshot shared with classmates. Do not edit.', 'read only', 260),

('Projects & sites', 'Tan''s Library', 'https://tanmay.is-a-good.dev/', 'Public reading shelf on your own domain.', 'live', 310),
('Projects & sites', 'Library admin', 'https://tanmayclaw-bot.github.io/tans-library-admin/', 'Manage books and suggestions. Magic-link sign-in.', '', 320),
('Projects & sites', 'Framer site (old)', 'https://iamtanmay.framer.website/', 'Original Framer version of the site, still up.', '', 330),
('Projects & sites', 'Academic Hub bot (Telegram)', 'https://t.me/DoraemonHubBot', 'Doraemon bot: uploads, homework, digests at 8 AM and 8:30 PM.', '', 340),
('Projects & sites', 'Academic Hub web app', 'https://academic-hub-f7dz.onrender.com/', 'Dashboard mini app. Free host naps; first open takes ~30-60 s.', '', 350),
('Projects & sites', 'Academic Hub code backup', 'https://drive.google.com/drive/folders/15bdE8hce9T-wlsoF20OMMgL9qPzCjzSN', 'Bot source code archive on Drive.', '', 360),
('Projects & sites', 'TeleDrive backup archive', 'https://drive.google.com/drive/folders/1-w564XLYd-iYH1nmgNH0jRVzhfmCdtlg', 'TeleDrive source + rebuild instructions insurance.', '', 370);
