-- Seed: Categories

INSERT INTO commerce.categories (slug, name_et, parent_id, sort_order) VALUES
('ajalugu-ja-poliitika', 'Ajalugu ja poliitika', NULL, 1),
('elulood-ja-memuaarid', 'Elulood ja memuaarid', NULL, 2),
('ilukirjandus', 'Ilukirjandus', NULL, 3),
('lasteraamatud', 'Lasteraamatud', NULL, 4),
('kultuur', 'Kultuur', NULL, 5),
('loodus', 'Loodus', NULL, 6),
('keha-ja-hing', 'Keha ja hing', NULL, 7),
('hobid', 'Hobid', NULL, 8),
('kinkeraamatud', 'Kinkeraamatud', NULL, 9),
('arhiiv', 'Arhiiv / läbi müüdud', NULL, 10);

WITH cats AS (SELECT id, slug FROM commerce.categories)
INSERT INTO commerce.categories (slug, name_et, parent_id, sort_order)
SELECT v.slug, v.name, c.id, v.sort_order
FROM (VALUES
  ('ajaviitekirjandus',  'Ajaviitekirjandus',       'ilukirjandus', 1),
  ('kaasaegne-ilukirjandus','Kaasaegne ilukirjandus','ilukirjandus', 2),
  ('ponevus-ja-krimi',   'Põnevus ja krimi',         'ilukirjandus', 3),
  ('ulme-ja-fantaasia',  'Ulme ja fantaasia',        'ilukirjandus', 4),
  ('noortekirjandus',    'Noortekirjandus',           'ilukirjandus', 5),
  ('luule',              'Luule',                     'ilukirjandus', 6),
  ('huumor',             'Huumor',                    'ilukirjandus', 7),
  ('laste-ilukirjandus',                'Ilukirjandus',               'lasteraamatud', 1),
  ('laste-teatmekirjandus',             'Teatmekirjandus',            'lasteraamatud', 2),
  ('lastekirjanduskeskus-soovitab',     'Lastekirjanduskeskus soovitab','lasteraamatud', 3),
  ('teatmeteosed',       'Teatmeteosed',              'kultuur', 1),
  ('teater-muusika-film','Teater, muusika, film',     'kultuur', 2),
  ('kirjandus',          'Kirjandus',                  'kultuur', 3),
  ('psuhholoogia',       'Psühholoogia',              'keha-ja-hing', 1),
  ('suhted-ja-perekond', 'Suhted ja perekond',        'keha-ja-hing', 2),
  ('tervis',             'Tervis',                     'keha-ja-hing', 3),
  ('kasitoo',            'Käsitöö',                    'hobid', 1),
  ('sport',              'Sport',                      'hobid', 2),
  ('reisimine',          'Reisimine',                  'hobid', 3),
  ('lemmikloomad',       'Lemmikloomad',               'hobid', 4),
  ('varia',              'Varia',                      'hobid', 5)
) AS v(slug, name, parent_slug, sort_order)
JOIN cats c ON c.slug = v.parent_slug;
