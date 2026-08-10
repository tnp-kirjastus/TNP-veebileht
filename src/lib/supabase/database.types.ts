// SEE FAIL ON GENEREERITUD — ära redigeeri käsitsi.
// Uuenda: npm run db:types
/* eslint-disable @typescript-eslint/no-empty-object-type */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
    profiles: {
      Row: {
      id: string;
      email: string | null;
      role: string | null;
      created_at: string | null;
      full_name: string | null;
      phone: string | null;
      status: string | null;
      updated_at: string | null;
      };
      Insert: {
      id: string;
      email?: string | null;
      role?: string | null;
      created_at?: string | null;
      full_name?: string | null;
      phone?: string | null;
      status?: string | null;
      updated_at?: string | null;
      };
      Update: {
      id?: string;
      email?: string | null;
      role?: string | null;
      created_at?: string | null;
      full_name?: string | null;
      phone?: string | null;
      status?: string | null;
      updated_at?: string | null;
      };
      Relationships: [];
    };
    };
    Views: { [_ in never]: never };
    Functions: {
    is_admin: {
      Args: {
      [_: string]: unknown;
      };
      Returns: unknown;
    };
    show_trgm: {
      Args: {
      [_: string]: unknown;
      };
      Returns: unknown;
    };
    show_limit: {
      Args: {
      [_: string]: unknown;
      };
      Returns: unknown;
    };
    unaccent: {
      Args: {
      [_: string]: unknown;
      };
      Returns: unknown;
    };
    };
    Enums: { [_ in never]: never };
  },
  commerce: {
    Tables: {
    products: {
      Row: {
      id: string;
      sku: string;
      title_et: string;
      title_en: string | null;
      slug: string;
      description_et: string | null;
      description_en: string | null;
      price: number;
      sale_price: number | null;
      sale_start: string | null;
      sale_end: string | null;
      stock: number;
      binding: string | null;
      pages: number | null;
      release_date: string | null;
      cover_image: string | null;
      origin: string | null;
      is_upcoming: boolean | null;
      is_archived: boolean | null;
      is_featured: boolean | null;
      series_id: string | null;
      search_vector: string | null;
      created_at: string | null;
      updated_at: string | null;
      allow_preorder: boolean;
      editions: Json | null;
      };
      Insert: {
      id?: string;
      sku: string;
      title_et: string;
      title_en?: string | null;
      slug: string;
      description_et?: string | null;
      description_en?: string | null;
      price?: number;
      sale_price?: number | null;
      sale_start?: string | null;
      sale_end?: string | null;
      stock?: number;
      binding?: string | null;
      pages?: number | null;
      release_date?: string | null;
      cover_image?: string | null;
      origin?: string | null;
      is_upcoming?: boolean | null;
      is_archived?: boolean | null;
      is_featured?: boolean | null;
      series_id?: string | null;
      search_vector?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      allow_preorder?: boolean;
      editions?: Json | null;
      };
      Update: {
      id?: string;
      sku?: string;
      title_et?: string;
      title_en?: string | null;
      slug?: string;
      description_et?: string | null;
      description_en?: string | null;
      price?: number;
      sale_price?: number | null;
      sale_start?: string | null;
      sale_end?: string | null;
      stock?: number;
      binding?: string | null;
      pages?: number | null;
      release_date?: string | null;
      cover_image?: string | null;
      origin?: string | null;
      is_upcoming?: boolean | null;
      is_archived?: boolean | null;
      is_featured?: boolean | null;
      series_id?: string | null;
      search_vector?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      allow_preorder?: boolean;
      editions?: Json | null;
      };
      Relationships: [];
    };
    coupons: {
      Row: {
      id: string;
      code: string;
      percent: number;
      max_discount: number;
      is_active: boolean;
      created_at: string;
      };
      Insert: {
      id?: string;
      code: string;
      percent: number;
      max_discount?: number;
      is_active?: boolean;
      created_at?: string;
      };
      Update: {
      id?: string;
      code?: string;
      percent?: number;
      max_discount?: number;
      is_active?: boolean;
      created_at?: string;
      };
      Relationships: [];
    };
    order_items: {
      Row: {
      id: string;
      order_id: string;
      product_id: string | null;
      title: string;
      price: number;
      quantity: number;
      };
      Insert: {
      id?: string;
      order_id: string;
      product_id?: string | null;
      title: string;
      price: number;
      quantity: number;
      };
      Update: {
      id?: string;
      order_id?: string;
      product_id?: string | null;
      title?: string;
      price?: number;
      quantity?: number;
      };
      Relationships: [];
    };
    cart_items: {
      Row: {
      id: string;
      cart_id: string;
      product_id: string;
      quantity: number;
      };
      Insert: {
      id?: string;
      cart_id: string;
      product_id: string;
      quantity?: number;
      };
      Update: {
      id?: string;
      cart_id?: string;
      product_id?: string;
      quantity?: number;
      };
      Relationships: [];
    };
    product_people: {
      Row: {
      product_id: string;
      person_id: string;
      role: string;
      };
      Insert: {
      product_id: string;
      person_id: string;
      role: string;
      };
      Update: {
      product_id?: string;
      person_id?: string;
      role?: string;
      };
      Relationships: [];
    };
    payment_events: {
      Row: {
      id: string;
      idempotency_key: string;
      order_id: string | null;
      event_type: string;
      payload: Json | null;
      processed_at: string | null;
      provider: string;
      provider_event_id: string | null;
      provider_transaction_id: string | null;
      amount: number | null;
      currency: string | null;
      merchant_identity: string | null;
      received_at: string;
      };
      Insert: {
      id?: string;
      idempotency_key: string;
      order_id?: string | null;
      event_type: string;
      payload?: Json | null;
      processed_at?: string | null;
      provider?: string;
      provider_event_id?: string | null;
      provider_transaction_id?: string | null;
      amount?: number | null;
      currency?: string | null;
      merchant_identity?: string | null;
      received_at?: string;
      };
      Update: {
      id?: string;
      idempotency_key?: string;
      order_id?: string | null;
      event_type?: string;
      payload?: Json | null;
      processed_at?: string | null;
      provider?: string;
      provider_event_id?: string | null;
      provider_transaction_id?: string | null;
      amount?: number | null;
      currency?: string | null;
      merchant_identity?: string | null;
      received_at?: string;
      };
      Relationships: [];
    };
    product_images: {
      Row: {
      id: string;
      product_id: string | null;
      url: string;
      sort_order: number | null;
      };
      Insert: {
      id?: string;
      product_id?: string | null;
      url: string;
      sort_order?: number | null;
      };
      Update: {
      id?: string;
      product_id?: string | null;
      url?: string;
      sort_order?: number | null;
      };
      Relationships: [];
    };
    carts: {
      Row: {
      id: string;
      session_id: string;
      created_at: string | null;
      updated_at: string | null;
      };
      Insert: {
      id?: string;
      session_id: string;
      created_at?: string | null;
      updated_at?: string | null;
      };
      Update: {
      id?: string;
      session_id?: string;
      created_at?: string | null;
      updated_at?: string | null;
      };
      Relationships: [];
    };
    product_categories: {
      Row: {
      product_id: string;
      category_id: string;
      };
      Insert: {
      product_id: string;
      category_id: string;
      };
      Update: {
      product_id?: string;
      category_id?: string;
      };
      Relationships: [];
    };
    categories: {
      Row: {
      id: string;
      slug: string;
      name_et: string;
      parent_id: string | null;
      sort_order: number | null;
      created_at: string | null;
      };
      Insert: {
      id?: string;
      slug: string;
      name_et: string;
      parent_id?: string | null;
      sort_order?: number | null;
      created_at?: string | null;
      };
      Update: {
      id?: string;
      slug?: string;
      name_et?: string;
      parent_id?: string | null;
      sort_order?: number | null;
      created_at?: string | null;
      };
      Relationships: [];
    };
    promotions: {
      Row: {
      id: string;
      name_et: string;
      discount_percent: number | null;
      discount_amount: number | null;
      starts_at: string | null;
      ends_at: string | null;
      is_active: boolean | null;
      created_at: string | null;
      };
      Insert: {
      id?: string;
      name_et: string;
      discount_percent?: number | null;
      discount_amount?: number | null;
      starts_at?: string | null;
      ends_at?: string | null;
      is_active?: boolean | null;
      created_at?: string | null;
      };
      Update: {
      id?: string;
      name_et?: string;
      discount_percent?: number | null;
      discount_amount?: number | null;
      starts_at?: string | null;
      ends_at?: string | null;
      is_active?: boolean | null;
      created_at?: string | null;
      };
      Relationships: [];
    };
    order_status_history: {
      Row: {
      id: string;
      order_id: string;
      status: string;
      note: string | null;
      changed_by: string | null;
      created_at: string | null;
      };
      Insert: {
      id?: string;
      order_id: string;
      status: string;
      note?: string | null;
      changed_by?: string | null;
      created_at?: string | null;
      };
      Update: {
      id?: string;
      order_id?: string;
      status?: string;
      note?: string | null;
      changed_by?: string | null;
      created_at?: string | null;
      };
      Relationships: [];
    };
    promotion_products: {
      Row: {
      promotion_id: string;
      product_id: string;
      };
      Insert: {
      promotion_id: string;
      product_id: string;
      };
      Update: {
      promotion_id?: string;
      product_id?: string;
      };
      Relationships: [];
    };
    orders: {
      Row: {
      id: string;
      order_number: string;
      status: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string | null;
      shipping_address: string | null;
      shipping_method: string | null;
      subtotal: number;
      shipping_cost: number | null;
      total: number;
      maksekeskus_id: string | null;
      confirmation_token: string;
      created_at: string | null;
      updated_at: string | null;
      cart_id: string | null;
      idempotency_key: string | null;
      currency: string;
      reconciliation_reason: string | null;
      shipment_id: string | null;
      tracking_code: string | null;
      shipping_carrier: string | null;
      invoice_requested: boolean;
      company_name: string | null;
      company_reg_code: string | null;
      coupon_code: string | null;
      coupon_discount: number | null;
      vat_amount: number | null;
      vat_percent: number | null;
      paid_at: string | null;
      shipped_at: string | null;
      delivered_at: string | null;
      cancelled_at: string | null;
      user_id: string | null;
      };
      Insert: {
      id?: string;
      order_number: string;
      status?: string;
      customer_name: string;
      customer_email: string;
      customer_phone?: string | null;
      shipping_address?: string | null;
      shipping_method?: string | null;
      subtotal: number;
      shipping_cost?: number | null;
      total: number;
      maksekeskus_id?: string | null;
      confirmation_token?: string;
      created_at?: string | null;
      updated_at?: string | null;
      cart_id?: string | null;
      idempotency_key?: string | null;
      currency?: string;
      reconciliation_reason?: string | null;
      shipment_id?: string | null;
      tracking_code?: string | null;
      shipping_carrier?: string | null;
      invoice_requested?: boolean;
      company_name?: string | null;
      company_reg_code?: string | null;
      coupon_code?: string | null;
      coupon_discount?: number | null;
      vat_amount?: number | null;
      vat_percent?: number | null;
      paid_at?: string | null;
      shipped_at?: string | null;
      delivered_at?: string | null;
      cancelled_at?: string | null;
      user_id?: string | null;
      };
      Update: {
      id?: string;
      order_number?: string;
      status?: string;
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string | null;
      shipping_address?: string | null;
      shipping_method?: string | null;
      subtotal?: number;
      shipping_cost?: number | null;
      total?: number;
      maksekeskus_id?: string | null;
      confirmation_token?: string;
      created_at?: string | null;
      updated_at?: string | null;
      cart_id?: string | null;
      idempotency_key?: string | null;
      currency?: string;
      reconciliation_reason?: string | null;
      shipment_id?: string | null;
      tracking_code?: string | null;
      shipping_carrier?: string | null;
      invoice_requested?: boolean;
      company_name?: string | null;
      company_reg_code?: string | null;
      coupon_code?: string | null;
      coupon_discount?: number | null;
      vat_amount?: number | null;
      vat_percent?: number | null;
      paid_at?: string | null;
      shipped_at?: string | null;
      delivered_at?: string | null;
      cancelled_at?: string | null;
      user_id?: string | null;
      };
      Relationships: [];
    };
    outbox: {
      Row: {
      id: string;
      event_type: string;
      payload: Json;
      created_at: string | null;
      processed_at: string | null;
      attempts: number;
      available_at: string;
      lease_id: string | null;
      leased_until: string | null;
      error_code: string | null;
      dead_lettered_at: string | null;
      };
      Insert: {
      id?: string;
      event_type: string;
      payload: Json;
      created_at?: string | null;
      processed_at?: string | null;
      attempts?: number;
      available_at?: string;
      lease_id?: string | null;
      leased_until?: string | null;
      error_code?: string | null;
      dead_lettered_at?: string | null;
      };
      Update: {
      id?: string;
      event_type?: string;
      payload?: Json;
      created_at?: string | null;
      processed_at?: string | null;
      attempts?: number;
      available_at?: string;
      lease_id?: string | null;
      leased_until?: string | null;
      error_code?: string | null;
      dead_lettered_at?: string | null;
      };
      Relationships: [];
    };
    stock_reservations: {
      Row: {
      id: string;
      order_id: string;
      product_id: string;
      quantity: number;
      status: string;
      expires_at: string;
      created_at: string;
      };
      Insert: {
      id?: string;
      order_id: string;
      product_id: string;
      quantity: number;
      status?: string;
      expires_at: string;
      created_at?: string;
      };
      Update: {
      id?: string;
      order_id?: string;
      product_id?: string;
      quantity?: number;
      status?: string;
      expires_at?: string;
      created_at?: string;
      };
      Relationships: [];
    };
    v_products: {
      Row: {
      id: string | null;
      sku: string | null;
      title_et: string | null;
      title_en: string | null;
      slug: string | null;
      description_et: string | null;
      description_en: string | null;
      price: number | null;
      sale_price: number | null;
      sale_start: string | null;
      sale_end: string | null;
      stock: number | null;
      binding: string | null;
      pages: number | null;
      release_date: string | null;
      origin: string | null;
      is_upcoming: boolean | null;
      is_archived: boolean | null;
      is_featured: boolean | null;
      allow_preorder: boolean | null;
      cover_image: string | null;
      editions: Json | null;
      created_at: string | null;
      updated_at: string | null;
      effective_price: number | null;
      is_on_sale: boolean | null;
      series_name: string | null;
      series_slug: string | null;
      categories: Json | null;
      category_ids: string[] | null;
      author_ids: string[] | null;
      people: Json | null;
      };
      Insert: {
      id?: string | null;
      sku?: string | null;
      title_et?: string | null;
      title_en?: string | null;
      slug?: string | null;
      description_et?: string | null;
      description_en?: string | null;
      price?: number | null;
      sale_price?: number | null;
      sale_start?: string | null;
      sale_end?: string | null;
      stock?: number | null;
      binding?: string | null;
      pages?: number | null;
      release_date?: string | null;
      origin?: string | null;
      is_upcoming?: boolean | null;
      is_archived?: boolean | null;
      is_featured?: boolean | null;
      allow_preorder?: boolean | null;
      cover_image?: string | null;
      editions?: Json | null;
      created_at?: string | null;
      updated_at?: string | null;
      effective_price?: number | null;
      is_on_sale?: boolean | null;
      series_name?: string | null;
      series_slug?: string | null;
      categories?: Json | null;
      category_ids?: string[] | null;
      author_ids?: string[] | null;
      people?: Json | null;
      };
      Update: {
      id?: string | null;
      sku?: string | null;
      title_et?: string | null;
      title_en?: string | null;
      slug?: string | null;
      description_et?: string | null;
      description_en?: string | null;
      price?: number | null;
      sale_price?: number | null;
      sale_start?: string | null;
      sale_end?: string | null;
      stock?: number | null;
      binding?: string | null;
      pages?: number | null;
      release_date?: string | null;
      origin?: string | null;
      is_upcoming?: boolean | null;
      is_archived?: boolean | null;
      is_featured?: boolean | null;
      allow_preorder?: boolean | null;
      cover_image?: string | null;
      editions?: Json | null;
      created_at?: string | null;
      updated_at?: string | null;
      effective_price?: number | null;
      is_on_sale?: boolean | null;
      series_name?: string | null;
      series_slug?: string | null;
      categories?: Json | null;
      category_ids?: string[] | null;
      author_ids?: string[] | null;
      people?: Json | null;
      };
      Relationships: [];
    };
    };
    Views: { [_ in never]: never };
    Functions: {
    shipment_create: {
      Args: {
      p_carrier: string;
      p_order_id: string;
      p_shipment_id: string;
      p_tracking_code: string;
      };
      Returns: unknown;
    };
    search_products: {
      Args: {
      category_slugs: string[];
      origin_filter: string;
      page_num: number;
      page_size: number;
      person_filters: Json;
      sale_end: string;
      sale_only: boolean;
      sale_open: boolean;
      sale_start: string;
      scope: string;
      search_term: string;
      sort_by: string;
      upcoming_only: boolean;
      };
      Returns: unknown;
    };
    get_order_by_token: {
      Args: {
      p_token: string;
      };
      Returns: unknown;
    };
    claim_outbox: {
      Args: {
      p_batch_size: number;
      p_worker_id: string;
      };
      Returns: unknown;
    };
    effective_price: {
      Args: {
      p: string;
      };
      Returns: unknown;
    };
    fail_outbox: {
      Args: {
      p_error_code: string;
      p_id: string;
      p_lease_id: string;
      };
      Returns: unknown;
    };
    rebuild_product_search_vector: {
      Args: {
      p_product_id: string;
      };
      Returns: unknown;
    };
    checkout_cart: {
      Args: {
      p_company_name: string;
      p_company_reg_code: string;
      p_coupon_code: string;
      p_customer: Json;
      p_idempotency_key: string;
      p_invoice_requested: boolean;
      p_session_id: string;
      };
      Returns: unknown;
    };
    process_payment_event: {
      Args: {
      p_amount: number;
      p_currency: string;
      p_event_id: string;
      p_merchant_identity: string;
      p_payload_hash: string;
      p_reference: string;
      p_status: string;
      p_transaction_id: string;
      };
      Returns: unknown;
    };
    release_expired_reservations: {
      Args: {
      p_batch_size: number;
      };
      Returns: unknown;
    };
    complete_outbox: {
      Args: {
      p_id: string;
      p_lease_id: string;
      };
      Returns: unknown;
    };
    };
    Enums: { [_ in never]: never };
  },
  content: {
    Tables: {
    pages: {
      Row: {
      id: string;
      slug: string;
      title_et: string;
      content_et: string | null;
      updated_at: string | null;
      };
      Insert: {
      id?: string;
      slug: string;
      title_et: string;
      content_et?: string | null;
      updated_at?: string | null;
      };
      Update: {
      id?: string;
      slug?: string;
      title_et?: string;
      content_et?: string | null;
      updated_at?: string | null;
      };
      Relationships: [];
    };
    contact_messages: {
      Row: {
      id: string;
      name: string;
      email: string;
      message: string;
      locale: string | null;
      is_read: boolean | null;
      created_at: string | null;
      };
      Insert: {
      id?: string;
      name: string;
      email: string;
      message: string;
      locale?: string | null;
      is_read?: boolean | null;
      created_at?: string | null;
      };
      Update: {
      id?: string;
      name?: string;
      email?: string;
      message?: string;
      locale?: string | null;
      is_read?: boolean | null;
      created_at?: string | null;
      };
      Relationships: [];
    };
    homepage: {
      Row: {
      key: string;
      hero: Json | null;
      cards: Json | null;
      sections: Json | null;
      updated_at: string | null;
      };
      Insert: {
      key?: string;
      hero?: Json | null;
      cards?: Json | null;
      sections?: Json | null;
      updated_at?: string | null;
      };
      Update: {
      key?: string;
      hero?: Json | null;
      cards?: Json | null;
      sections?: Json | null;
      updated_at?: string | null;
      };
      Relationships: [];
    };
    campaigns: {
      Row: {
      id: string;
      slug: string;
      name_et: string;
      description_et: string | null;
      banner_url: string | null;
      starts_at: string | null;
      ends_at: string | null;
      is_active: boolean | null;
      };
      Insert: {
      id?: string;
      slug: string;
      name_et: string;
      description_et?: string | null;
      banner_url?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
      is_active?: boolean | null;
      };
      Update: {
      id?: string;
      slug?: string;
      name_et?: string;
      description_et?: string | null;
      banner_url?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
      is_active?: boolean | null;
      };
      Relationships: [];
    };
    posts: {
      Row: {
      id: string;
      slug: string;
      title_et: string;
      excerpt_et: string | null;
      content_et: string | null;
      image_url: string | null;
      published_at: string | null;
      is_published: boolean | null;
      created_at: string | null;
      title_en: string | null;
      excerpt_en: string | null;
      content_en: string | null;
      seo_title: string | null;
      seo_description: string | null;
      updated_at: string;
      author_id: string | null;
      };
      Insert: {
      id?: string;
      slug: string;
      title_et: string;
      excerpt_et?: string | null;
      content_et?: string | null;
      image_url?: string | null;
      published_at?: string | null;
      is_published?: boolean | null;
      created_at?: string | null;
      title_en?: string | null;
      excerpt_en?: string | null;
      content_en?: string | null;
      seo_title?: string | null;
      seo_description?: string | null;
      updated_at?: string;
      author_id?: string | null;
      };
      Update: {
      id?: string;
      slug?: string;
      title_et?: string;
      excerpt_et?: string | null;
      content_et?: string | null;
      image_url?: string | null;
      published_at?: string | null;
      is_published?: boolean | null;
      created_at?: string | null;
      title_en?: string | null;
      excerpt_en?: string | null;
      content_en?: string | null;
      seo_title?: string | null;
      seo_description?: string | null;
      updated_at?: string;
      author_id?: string | null;
      };
      Relationships: [];
    };
    campaign_products: {
      Row: {
      campaign_id: string;
      product_id: string;
      };
      Insert: {
      campaign_id: string;
      product_id: string;
      };
      Update: {
      campaign_id?: string;
      product_id?: string;
      };
      Relationships: [];
    };
    series: {
      Row: {
      id: string;
      slug: string;
      name_et: string;
      description_et: string | null;
      cover_image: string | null;
      created_at: string | null;
      };
      Insert: {
      id?: string;
      slug: string;
      name_et: string;
      description_et?: string | null;
      cover_image?: string | null;
      created_at?: string | null;
      };
      Update: {
      id?: string;
      slug?: string;
      name_et?: string;
      description_et?: string | null;
      cover_image?: string | null;
      created_at?: string | null;
      };
      Relationships: [];
    };
    settings: {
      Row: {
      key: string;
      shipping: Json | null;
      email: Json | null;
      vat: Json | null;
      company: Json | null;
      social: Json | null;
      updated_at: string | null;
      };
      Insert: {
      key?: string;
      shipping?: Json | null;
      email?: Json | null;
      vat?: Json | null;
      company?: Json | null;
      social?: Json | null;
      updated_at?: string | null;
      };
      Update: {
      key?: string;
      shipping?: Json | null;
      email?: Json | null;
      vat?: Json | null;
      company?: Json | null;
      social?: Json | null;
      updated_at?: string | null;
      };
      Relationships: [];
    };
    };
    Views: { [_ in never]: never };
    Functions: {
    submit_contact_message: {
      Args: {
      p_email: string;
      p_locale: string;
      p_message: string;
      p_name: string;
      };
      Returns: unknown;
    };
    };
    Enums: { [_ in never]: never };
  },
  people: {
    Tables: {
    people: {
      Row: {
      id: string;
      slug: string;
      name: string;
      bio_et: string | null;
      created_at: string | null;
      updated_at: string | null;
      };
      Insert: {
      id?: string;
      slug: string;
      name: string;
      bio_et?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      };
      Update: {
      id?: string;
      slug?: string;
      name?: string;
      bio_et?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      };
      Relationships: [];
    };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  },
};

export type Tables<S extends keyof Database, T extends keyof Database[S]["Tables"]> =
  Database[S]["Tables"][T] extends { Row: infer R } ? R : never;
