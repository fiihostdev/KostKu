import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Gunakan tipe SupabaseClient yang fleksibel agar tidak ada type mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = ReturnType<typeof createServiceClient<any>>;

/**
 * POST /api/payment/create-transaction
 * Dibuat dari halaman publik kost oleh calon penyewa yang ingin booking
 * atau dari admin dashboard saat menagih penyewa yang sudah ada.
 *
 * Body: {
 *   kostId:        string   — UUID kost_profiles
 *   invoiceId:     string?  — UUID invoice existing (jika sudah ada)
 *   provider:      "midtrans" | "tripay" | "xendit"
 *   customerName:  string
 *   customerEmail: string
 *   customerPhone: string
 *   kamar:         string
 *   nominal:       number
 *   description:   string?
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      kostId, invoiceId, provider,
      customerName, customerEmail, customerPhone,
      kamar, nominal, description,
    } = body;

    if (!kostId || !provider || !customerName || !nominal) {
      return NextResponse.json({ error: "kostId, provider, customerName, nominal wajib diisi" }, { status: 400 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ambil config payment gateway kost ini
    const { data: config, error: configError } = await supabase
      .from("payment_configs")
      .select("*")
      .eq("kost_id", kostId)
      .eq("provider", provider)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: `Payment gateway ${provider} belum dikonfigurasi atau tidak aktif untuk kost ini` }, { status: 400 });
    }

    // Ambil/buat invoice
    let invoice: Record<string, unknown>;
    if (invoiceId) {
      const { data, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      if (error || !data) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
      invoice = data;
    } else {
      // Buat invoice baru otomatis
      const year  = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("kost_id", kostId);
      const seq = String((count || 0) + 1).padStart(3, "0");
      const noInvoice = `INV/${year}/${month}/${seq}`;

      const jatuhTempo = new Date();
      jatuhTempo.setDate(jatuhTempo.getDate() + 3); // 3 hari dari sekarang

      const { data, error } = await supabase.from("invoices").insert({
        kost_id:    kostId,
        no_invoice: noInvoice,
        penyewa:    customerName,
        kamar:      kamar,
        nominal:    nominal,
        jatuh_tempo: jatuhTempo.toISOString().split("T")[0],
        metode:     provider,
        status:     "Menunggu",
        payment_provider: provider,
      }).select().single();
      if (error || !data) return NextResponse.json({ error: `Gagal buat invoice: ${error?.message}` }, { status: 500 });
      invoice = data;
    }

    const orderId = `KOSTKU-${invoice.id}-${Date.now()}`;

    // ── Proses per provider ──────────────────────────────────────────────────
    if (provider === "midtrans") {
      return await createMidtransTransaction({ config, invoice, orderId, customerName, customerEmail, customerPhone, nominal, kamar, description, supabase });
    }
    if (provider === "tripay") {
      return await createTripayTransaction({ config, invoice, orderId, customerName, customerEmail, customerPhone, nominal, kamar, description, supabase });
    }
    if (provider === "xendit") {
      return await createXenditTransaction({ config, invoice, orderId, customerName, customerEmail, customerPhone, nominal, kamar, description, supabase });
    }

    return NextResponse.json({ error: "Provider tidak dikenal" }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-transaction]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Midtrans Snap ─────────────────────────────────────────────────────────────
async function createMidtransTransaction({ config, invoice, orderId, customerName, customerEmail, customerPhone, nominal, kamar, description, supabase }: {
  config: Record<string, unknown>;
  invoice: Record<string, unknown>;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  nominal: number;
  kamar: string;
  description?: string;
  supabase: AnySupabase;
}) {
  const cfg = config.config as Record<string, string>;
  const serverKey  = cfg.server_key;
  const isProduction = config.is_production as boolean;

  if (!serverKey) {
    return NextResponse.json({ error: "Midtrans Server Key belum dikonfigurasi" }, { status: 400 });
  }

  const baseUrl = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: nominal,
    },
    customer_details: {
      first_name: customerName,
      email: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, "")}@kostku.id`,
      phone: customerPhone || "08000000000",
    },
    item_details: [{
      id:       String(invoice.id),
      price:    nominal,
      quantity: 1,
      name:     description || `Sewa ${kamar}`,
    }],
    callbacks: {
      finish:  `${process.env.NEXT_PUBLIC_APP_URL}/payment/finish?orderId=${orderId}`,
      error:   `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?orderId=${orderId}`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/payment/pending?orderId=${orderId}`,
    },
  };

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[midtrans] Error:", errText);
    return NextResponse.json({ error: `Midtrans error ${res.status}: ${errText.slice(0, 300)}` }, { status: 502 });
  }

  const data = await res.json();

  // Simpan token & payment URL ke invoice
  await supabase.from("invoices").update({
    payment_provider: "midtrans",
    payment_token:    data.token,
    payment_url:      data.redirect_url,
    payment_ref:      orderId,
  }).eq("id", invoice.id);

  return NextResponse.json({
    success:      true,
    provider:     "midtrans",
    invoiceId:    invoice.id,
    noInvoice:    invoice.no_invoice,
    token:        data.token,
    redirectUrl:  data.redirect_url,
    orderId,
  });
}

// ── Tripay ────────────────────────────────────────────────────────────────────
async function createTripayTransaction({ config, invoice, orderId, customerName, customerEmail, customerPhone, nominal, kamar, description, supabase }: {
  config: Record<string, unknown>;
  invoice: Record<string, unknown>;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  nominal: number;
  kamar: string;
  description?: string;
  supabase: AnySupabase;
}) {
  const cfg = config.config as Record<string, string>;
  const apiKey     = cfg.api_key;
  const privateKey = cfg.private_key;
  const merchantCode = cfg.merchant_code;
  const isProduction = config.is_production as boolean;

  if (!apiKey || !privateKey || !merchantCode) {
    return NextResponse.json({ error: "Tripay API Key, Private Key, dan Merchant Code belum dikonfigurasi" }, { status: 400 });
  }

  const baseUrl = isProduction
    ? "https://tripay.co.id/api"
    : "https://tripay.co.id/api-sandbox";

  // Signature: HMAC-SHA256(merchantCode + orderId + nominal, privateKey)
  const { createHmac } = await import("crypto");
  const signature = createHmac("sha256", privateKey)
    .update(`${merchantCode}${orderId}${nominal}`)
    .digest("hex");

  const payload = {
    method:           cfg.channel || "QRIS",
    merchant_ref:     orderId,
    amount:           nominal,
    customer_name:    customerName,
    customer_email:   customerEmail || `${customerName.toLowerCase().replace(/\s+/g, "")}@kostku.id`,
    customer_phone:   customerPhone || "08000000000",
    order_items: [{
      sku:      String(invoice.id).slice(0, 20),
      name:     description || `Sewa ${kamar}`,
      price:    nominal,
      quantity: 1,
    }],
    callback_url:  `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook?provider=tripay`,
    return_url:    `${process.env.NEXT_PUBLIC_APP_URL}/payment/finish`,
    expired_time:  Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 jam
    signature,
  };

  const res = await fetch(`${baseUrl}/transaction/create`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `Tripay error ${res.status}: ${errText.slice(0, 300)}` }, { status: 502 });
  }

  const data = await res.json();
  if (!data.success) {
    return NextResponse.json({ error: `Tripay: ${data.message}` }, { status: 400 });
  }

  await supabase.from("invoices").update({
    payment_provider: "tripay",
    payment_ref:      data.data.reference,
    payment_url:      data.data.checkout_url,
    payment_token:    data.data.reference,
  }).eq("id", invoice.id);

  return NextResponse.json({
    success:     true,
    provider:    "tripay",
    invoiceId:   invoice.id,
    noInvoice:   invoice.no_invoice,
    redirectUrl: data.data.checkout_url,
    reference:   data.data.reference,
    orderId,
  });
}

// ── Xendit ────────────────────────────────────────────────────────────────────
async function createXenditTransaction({ config, invoice, orderId, customerName, customerEmail, customerPhone, nominal, kamar, description, supabase }: {
  config: Record<string, unknown>;
  invoice: Record<string, unknown>;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  nominal: number;
  kamar: string;
  description?: string;
  supabase: AnySupabase;
}) {
  const cfg = config.config as Record<string, string>;
  const secretKey = cfg.secret_key;
  const isProduction = config.is_production as boolean;

  if (!secretKey) {
    return NextResponse.json({ error: "Xendit Secret Key belum dikonfigurasi" }, { status: 400 });
  }

  // Xendit menggunakan API yang sama untuk sandbox & production, dibedakan dari key
  const auth = Buffer.from(`${secretKey}:`).toString("base64");

  const payload = {
    external_id:    orderId,
    amount:         nominal,
    description:    description || `Sewa ${kamar}`,
    payer_email:    customerEmail || `${customerName.toLowerCase().replace(/\s+/g, "")}@kostku.id`,
    customer: {
      given_names:    customerName,
      email:          customerEmail || "",
      mobile_number:  customerPhone || "",
    },
    success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/finish`,
    failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error`,
    currency: "IDR",
    items: [{
      name:     description || `Sewa ${kamar}`,
      quantity: 1,
      price:    nominal,
    }],
  };

  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `Xendit error ${res.status}: ${errText.slice(0, 300)}` }, { status: 502 });
  }

  const data = await res.json();

  await supabase.from("invoices").update({
    payment_provider: "xendit",
    payment_ref:      data.id,
    payment_url:      data.invoice_url,
    payment_token:    data.id,
  }).eq("id", invoice.id);

  return NextResponse.json({
    success:     true,
    provider:    "xendit",
    invoiceId:   invoice.id,
    noInvoice:   invoice.no_invoice,
    redirectUrl: data.invoice_url,
    xenditId:    data.id,
    orderId,
  });
}
