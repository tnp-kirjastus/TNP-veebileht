-- Migration 038: Lasteraamatud alamkategooria "Ilukirjandus" → "Laste ilukirjandus".
-- Andmebaasis oli kaks samanimelist kategooriat (juur "Ilukirjandus" ja
-- laste-alamkategooria), mis tegi Exceli impordi nimepõhise vastendamise
-- mitmetähenduslikuks. Slug (laste-ilukirjandus) ja seosed jäävad samaks;
-- otsinguvektorid uuendab trigger trg_category_name_search automaatselt.

UPDATE commerce.categories
SET name_et = 'Laste ilukirjandus'
WHERE slug = 'laste-ilukirjandus' AND name_et = 'Ilukirjandus';
