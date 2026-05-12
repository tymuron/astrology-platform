-- ============================================================
-- SEED DATA: Pre-populate all course modules and lessons
-- Run this AFTER supabase_schema.sql
-- ============================================================

-- 1. INSERT WEEKS (MODULES)
-- Using fixed UUIDs so we can reference them for days (lessons)

INSERT INTO public.weeks (id, title, description, order_index, available_from) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sanfter Start', 'Einstieg in die Vastulogie — Start der Sichtbarkeit in Vastu auf Social Media', 0, '2026-02-07T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000002', 'Modul 1', 'Vastu Karte, Elemente, Reinigung & Energien', 1, '2026-03-20T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000003', 'Modul 2', 'Planeten, Charaktere, Sektoren, Yantren', 2, '2026-03-25T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000004', 'Modul 3', 'Räume im Detail — Schlafzimmer, Küche, Bad & mehr', 3, '2026-04-01T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000005', 'Modul 4', 'Eingangstür, Berufung & Spiegel', 4, '2026-04-08T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000006', 'Modul 5', 'Vastu Design für jeden Sektor & alle Räume mit Praxis & visuellen Beispielen', 5, '2026-04-15T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000007', 'Modul 6', 'Vastu Coaching', 6, '2026-04-22T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000008', 'Modul 7', 'Bilder & spezielle Korrekturen', 7, '2026-04-29T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000009', 'Bonusmodule', 'Zusätzliche Themen rund um Vastu', 8, NULL)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index,
  available_from = EXCLUDED.available_from;

-- 2. INSERT DAYS (LESSONS)

INSERT INTO public.days (id, week_id, title, description, order_index) VALUES
  -- Modul 1
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '1.1 Vastu Karte & Elemente', NULL, 0),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '1.2 Energetische Reinigung', NULL, 1),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '1.3 Experimente mit den Elementen', NULL, 2),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '1.4 Innere & Äußere Energien', NULL, 3),

  -- Modul 2
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '2.1 Planeten, Charaktere, Sektoren, Yantren', NULL, 0),

  -- Modul 3
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', '3.1 Schlafzimmer, Arbeitszimmer, Küche & andere Zimmer', NULL, 0),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000004', '3.2 Toilette & Badezimmer', NULL, 1),

  -- Modul 4
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', '4.1 Eingangstür & Berufung', NULL, 0),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', '4.2 Spiegel', NULL, 1),

  -- Modul 5
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000006', '5.1 Vastu Design für jeden Sektor & alle Räume', NULL, 0),

  -- Modul 6
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000007', '6.1 Vastu Coaching Übungen & Beispiele', NULL, 0),

  -- Modul 7
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000008', '7.1 Verstärkungen durch Bilder', NULL, 0),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000008', '7.2 Vastu-Korrekturen in verschiedenen Lebenssituationen', NULL, 1),

  -- Bonus
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000009', 'Grundstück nach Vastu', NULL, 0),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000009', 'Haustiere', NULL, 1),
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000009', 'Umzug', NULL, 2),
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000009', 'Pflanzen', NULL, 3)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- 3. INSERT LIBRARY ITEMS

INSERT INTO public.library_items (id, title, category, file_url, description, is_master_file, available_from) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Alle Slides — Komplett', 'slides', '#', 'Vollständige Sammlung aller Präsentationsfolien der Ausbildung', true, '2026-04-15T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000002', 'Vastu Reinigung – Leitfaden', 'guide', '#', 'Schritt-für-Schritt-Anleitung zur energetischen Reinigung', false, NULL),
  ('20000000-0000-0000-0000-000000000003', 'Bonus: Haustiere, Pflanzen & Tiere', 'bonus', '#', 'Zusätzliches Material rund um Haustiere, Pflanzen und Tiere im Vastu', false, NULL),
  ('20000000-0000-0000-0000-000000000004', 'Bonus: Grundstück [bei Feedback]', 'bonus', '#', 'Grundstücksauswahl und -bewertung nach Vastu-Prinzipien', false, NULL)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_master_file = EXCLUDED.is_master_file,
  available_from = EXCLUDED.available_from;

-- 4. CREATE ADMIN USER PROFILE
-- After Maria signs up via the app, run this to promote her to admin:
-- UPDATE public.profiles SET role = 'teacher' WHERE email = 'maria@vastulogie.de';
