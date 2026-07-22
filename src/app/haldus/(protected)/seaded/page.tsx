import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import type { StoreSettings } from "../../settings-actions";

const DEFAULT_SHIPPING: StoreSettings["shipping"] = {
  rates: [
    { carrier: "omniva", method: "parcel_machine", price: 5.0, freeFrom: 40, label_et: "Omniva pakiautomaat" },
    { carrier: "smartpost", method: "parcel_machine", price: 3.5, freeFrom: 40, label_et: "Smartpost pakiautomaat" },
  ],
  api: {
    maksekeskusLiveUrl: "https://api.maksekeskus.ee",
    maksekeskusTestUrl: "https://api.test.maksekeskus.ee",
    parcelMachineType: "APT,PUP",
    parcelMachineCountryFilter: "ee",
  },
};

const DEFAULT_EMAIL: StoreSettings["email"] = {
  fromAddress: "",
  orderSubject: "",
  orderBody: "",
  contactEmail: "",
  notifications: {},
  statusTemplates: {
    pending: { subject: "Tellimus {{orderNumber}} ootab makset", heading: "Tellimus ootab makset", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on registreeritud ja ootab makset. Makse kinnitusel asume seda komplekteerima.</p>" },
    payment_pending: { subject: "Tellimus {{orderNumber}} ootab makset", heading: "Tellimus ootab makset", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> ootab makset. Makse kinnitusel asume seda komplekteerima.</p>" },
    paid: { subject: "Tellimus {{orderNumber}} makse kinnitatud", heading: "Aitäh tellimuse eest!", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Makse on kinnitatud. Saime teie tellimuse kätte ning asume seda komplekteerima. Saadame peatselt teavituse, kui tellimus on teele pandud.</p>" },
    processing: { subject: "Tellimus {{orderNumber}} on töötlemisel", heading: "Tellimus on töötlemisel", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on töötlemisel. Tegeleme selle komplekteerimisega.</p>" },
    shipped: { subject: "Tellimus {{orderNumber}} on saadetud", heading: "Tellimus on saadetud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on üle antud kullerile ja on teel Teieni.</p>" },
    delivered: { subject: "Tellimus {{orderNumber}} on kohale toimetatud", heading: "Tellimus on kohale toimetatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on kohale toimetatud. Täname ostu eest!</p>" },
    cancelled: { subject: "Tellimus {{orderNumber}} on tühistatud", heading: "Tellimus on tühistatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on tühistatud. Küsimuste korral võtke meiega ühendust.</p>" },
    payment_failed: { subject: "Tellimus {{orderNumber}} makse ebaõnnestus", heading: "Makse ebaõnnestus", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> makse ebaõnnestus. Palun proovige uuesti.</p>" },
    expired: { subject: "Tellimus {{orderNumber}} on aegunud", heading: "Tellimus on aegunud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> on aegunud. Soovi korral saate teha uue tellimuse.</p>" },
    manual_review: { subject: "Tellimus {{orderNumber}} on ülevaatusel", heading: "Tellimus on ülevaatusel", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> vajab käsitsi ülevaatust. Võtame peatselt ühendust.</p>" },
    refunded: { subject: "Tellimus {{orderNumber}} on tagastatud", heading: "Tellimus on tagastatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> summa on tagastatud.</p>" },
    preorder: { subject: "Ettetellimus {{orderNumber}} vastu võetud", heading: "Ettetellimus vastu võetud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie ettetellimus <strong>#{{orderNumber}}</strong> on vastu võetud. Anname teada, kui raamatud on saadaval.</p>" },
  },
};

const DEFAULT_VAT: StoreSettings["vat"] = { percent: 9 };
const DEFAULT_COMPANY: StoreSettings["company"] = { name: "", email: "", phone: "", address: "", regCode: "" };
const DEFAULT_SOCIAL: StoreSettings["social"] = { facebook: "", instagram: "" };
const DEFAULT_THEME: StoreSettings["theme"] = { accentColor: "#4a1aa1", accentColorDark: "#31106c" };

async function loadSettings(): Promise<StoreSettings> {
  const db = createAdminClient();
  const { data } = await db.schema("content").from("settings")
    .select("shipping, email, vat, company, social")
    .eq("key", "store")
    .maybeSingle();

  const shippingRaw = data?.shipping as Record<string, unknown> | null | undefined;
  const shippingRates = (shippingRaw?.rates as unknown[]) ?? DEFAULT_SHIPPING.rates;
  const shippingApiRaw = shippingRaw?.api as Record<string, string> | null | undefined;

  const emailRaw = data?.email as Record<string, unknown> | null | undefined;

  return {
    shipping: {
      rates: (shippingRates.length ? shippingRates : DEFAULT_SHIPPING.rates) as StoreSettings["shipping"]["rates"],
      api: {
        maksekeskusLiveUrl: shippingApiRaw?.maksekeskusLiveUrl || DEFAULT_SHIPPING.api.maksekeskusLiveUrl,
        maksekeskusTestUrl: shippingApiRaw?.maksekeskusTestUrl || DEFAULT_SHIPPING.api.maksekeskusTestUrl,
        parcelMachineType: shippingApiRaw?.parcelMachineType || DEFAULT_SHIPPING.api.parcelMachineType,
        parcelMachineCountryFilter: shippingApiRaw?.parcelMachineCountryFilter || DEFAULT_SHIPPING.api.parcelMachineCountryFilter,
      },
    },
    email: {
      fromAddress: (emailRaw?.fromAddress as string) || DEFAULT_EMAIL.fromAddress,
      orderSubject: (emailRaw?.orderSubject as string) || DEFAULT_EMAIL.orderSubject,
      orderBody: (emailRaw?.orderBody as string) || DEFAULT_EMAIL.orderBody,
      contactEmail: (emailRaw?.contactEmail as string) || DEFAULT_EMAIL.contactEmail,
      notifications: (emailRaw?.notifications as Record<string, boolean>) ?? DEFAULT_EMAIL.notifications,
      statusTemplates: (emailRaw?.statusTemplates as Record<string, { subject: string; heading: string; bodyHtml: string }>) ?? DEFAULT_EMAIL.statusTemplates,
    },
    vat: (data?.vat ?? DEFAULT_VAT) as StoreSettings["vat"],
    company: (data?.company ?? DEFAULT_COMPANY) as StoreSettings["company"],
    social: (data?.social ?? DEFAULT_SOCIAL) as StoreSettings["social"],
    theme: DEFAULT_THEME,
  };
}

export default async function SettingsPage() {
  await requireAdminSession(["admin"]);

  const settings = await loadSettings();

  return (
    <div>
      <AdminPageHeader
        title="Seaded"
        description="Poe seadete haldamine — tarne, e-kirjad, käibemaks, ettevõtte info, sotsiaalmeedia ja kujundus."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
