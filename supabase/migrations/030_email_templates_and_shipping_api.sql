-- Migration 030: Email templates per status, shipping API settings, and theme column.
-- Adds status-specific email template fields to content.settings.email,
-- shipping API configuration fields, and ensures the theme column exists.

-- 1. Ensure theme column exists (referenced in code but no migration found)
ALTER TABLE content.settings
  ADD COLUMN IF NOT EXISTS theme JSONB;

-- 2. Add status-specific email templates into the email JSONB
-- Each status gets: subject, heading, bodyHtml
UPDATE content.settings
SET email = COALESCE(email, '{}'::jsonb) || '{
  "statusTemplates": {
    "pending": {
      "subject": "Tellimus {{orderNumber}} ootab makset",
      "heading": "Tellimus ootab makset",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on registreeritud ja ootab makset. Makse kinnitusel asume seda komplekteerima.</p>"
    },
    "payment_pending": {
      "subject": "Tellimus {{orderNumber}} ootab makset",
      "heading": "Tellimus ootab makset",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> ootab makset. Makse kinnitusel asume seda komplekteerima.</p>"
    },
    "paid": {
      "subject": "Tellimus {{orderNumber}} makse kinnitatud",
      "heading": "Aitäh tellimuse eest!",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Makse on kinnitatud. Saime teie tellimuse kätte ning asume seda komplekteerima. Saadame peatselt teavituse, kui tellimus on teele pandud.</p>"
    },
    "processing": {
      "subject": "Tellimus {{orderNumber}} on töötlemisel",
      "heading": "Tellimus on töötlemisel",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on töötlemisel. Tegeleme selle komplekteerimisega.</p>"
    },
    "shipped": {
      "subject": "Tellimus {{orderNumber}} on saadetud",
      "heading": "Tellimus on saadetud",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on üle antud kullerile ja on teel Teieni.</p>"
    },
    "delivered": {
      "subject": "Tellimus {{orderNumber}} on kohale toimetatud",
      "heading": "Tellimus on kohale toimetatud",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on kohale toimetatud. Täname ostu eest!</p>"
    },
    "cancelled": {
      "subject": "Tellimus {{orderNumber}} on tühistatud",
      "heading": "Tellimus on tühistatud",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on tühistatud. Küsimuste korral võtke meiega ühendust.</p>"
    },
    "payment_failed": {
      "subject": "Tellimus {{orderNumber}} makse ebaõnnestus",
      "heading": "Makse ebaõnnestus",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> makse ebaõnnestus. Palun proovige uuesti.</p>"
    },
    "expired": {
      "subject": "Tellimus {{orderNumber}} on aegunud",
      "heading": "Tellimus on aegunud",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> on aegunud. Soovi korral saate teha uue tellimuse.</p>"
    },
    "manual_review": {
      "subject": "Tellimus {{orderNumber}} on ülevaatusel",
      "heading": "Tellimus on ülevaatusel",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> vajab käsitsi ülevaatust. Võtame peatselt ühendust.</p>"
    },
    "refunded": {
      "subject": "Tellimus {{orderNumber}} on tagastatud",
      "heading": "Tellimus on tagastatud",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> summa on tagastatud.</p>"
    },
    "preorder": {
      "subject": "Ettetellimus {{orderNumber}} vastu võetud",
      "heading": "Ettetellimus vastu võetud",
      "bodyHtml": "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie ettetellimus <strong>#{{orderNumber}}</strong> on vastu võetud. Anname teada, kui raamatud on saadaval.</p>"
    }
  }
}'::jsonb
WHERE key = 'store'
  AND (email->'statusTemplates') IS NULL;

-- 3. Add shipping API configuration defaults
UPDATE content.settings
SET shipping = COALESCE(shipping, '{}'::jsonb) || '{
  "api": {
    "maksekeskusLiveUrl": "https://api.maksekeskus.ee",
    "maksekeskusTestUrl": "https://api.test.maksekeskus.ee",
    "parcelMachineType": "APT,PUP",
    "parcelMachineCountryFilter": "ee"
  }
}'::jsonb
WHERE key = 'store'
  AND (shipping->'api') IS NULL;

-- 4. Add default theme if column is null
UPDATE content.settings
SET theme = COALESCE(theme, '{}'::jsonb) || '{
  "accentColor": "#4a1aa1",
  "accentColorDark": "#31106c"
}'::jsonb
WHERE key = 'store'
  AND (theme IS NULL OR theme->'accentColor' IS NULL);

-- 5. Add shipping labels field for carrier display names in settings
UPDATE content.settings
SET email = COALESCE(email, '{}'::jsonb) || jsonb_build_object(
  'contactEmail', COALESCE(email->>'contactEmail', 'tellimused@tnp.ee')
)
WHERE key = 'store'
  AND (email->>'contactEmail') IS NULL;

-- 6. Default theme settings if no theme row exists
UPDATE content.settings
SET theme = COALESCE(theme, '{"accentColor": "#4a1aa1", "accentColorDark": "#31106c"}'::jsonb)
WHERE key = 'store';
