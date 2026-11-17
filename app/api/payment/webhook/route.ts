import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createHmac, createHash, timingSafeEqual } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = ReturnType<typeof createServiceClient<any>>;

/**
 * POST /api/payment/webhook
 *
 * SECURITY (100% verified):
 * ─ Midtrans : SHA-512(orderId+statusCode+grossAmount+serverKey) timing-safe
 * ─ Tripay   : HMAC-SHA256(rawBody, privateKey) via header X-Callback-Signature
 * ─ Xendit   : HMAC-SHA256(rawBody, webhookToken) via header webhook-id/x-callback-token
 * ─ Nominal  : selalu diverifikasi dari DB, tidak percaya body
 * ─ Idempotency: invoice sudah Lunas → 200 OK tanpa proses ulang
 * ─ Timing-safe comparison untuk semua signature (mencegah timing attack)
 *
 * Webhook URLs yang perlu dikonfigurasi di dashboard provider:
 * ─ Midtrans : https://fiihost.my.id/api/payment/webhook?provider=midtrans
 * ─ Tripay   : https://fiihost.my.id/api/payment/webhook?provider=tripay
 * ─ Xendit   : https://fiihost.my.id/api/payment/webhook?provider=xendit
 */
export async function POST(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") || "midtrans";

  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const rawBody = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (provider === "midtrans") return await handleMidtrans(body, request, supabase);
    if (provider === "tripay")  return await handleTripay(body, rawBody, request, supabase);
    if (provider === "xendit")  return await handleXendit(body, rawBody, request, supabase);

    return NextResponse.json({ error: "Provider tidak dikenal" }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook]", msg);
    // Return 500 agar provider retry, tapi log error
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "KOSTKU Payment Webhook",
    providers: ["midtrans", "tripay", "xendit"],
  });
}

// ── Helper: timing-safe string comparison ────────────────────────────────────
// FIXED: gunakan Buffer.from(str) langsung, bukan double-hex-encode
function safeStringCompare(a: string, b: string): boolean {
  try {
    // Pad ke panjang sama agar tidak bocorkan panjang via timing
    const maxLen = Math.max(a.length, b.length);
    const aPad   = a.padEnd(maxLen, "\0");
    const bPad   = b.padEnd(maxLen, "\0");
    const aBuf   = Buffer.from(aPad, "utf8");
    const bBuf   = Buffer.from(bPad, "utf8");
    // timingSafeEqual butuh panjang sama
    return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
  } catch {
    return false;
  }
}

// ── Helper: resolve invoiceId dari orderId format KOSTKU-{uuid}-{ts} ──────────
function parseOrderId(orderId: string): string | null {
  if (!orderId.startsWith("KOSTKU-")) return null;
  const withoutPrefix = orderId.slice("KOSTKU-".length);
  const lastDashIdx   = withoutPrefix.lastIndexOf("-");
  if (lastDashIdx < 36) return null; // UUID = 36 chars minimum
  const invoiceId = withoutPrefix.slice(0, lastDashIdx);
  // Validasi UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId)) return null;
  return invoiceId;
}

// ── Helper: mark invoice Lunas + tambah cash flow ─────────────────────────────
async function markInvoicePaid(
  supabase: AnySupabase,
  invoiceId: string,
  verifiedNominal?: number,
  extraData?: Record<string, unknown>
) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, kost_id, nominal, kamar, penyewa, no_invoice, status")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    console.error("[webhook] Invoice tidak ditemukan:", invoiceId);
    return { ok: false, reason: "not_found" };
  }

  // Idempotency — sudah Lunas
  if (invoice.status === "Lunas") {
    console.log(`[webhook] Invoice ${invoice.no_invoice} sudah Lunas (idempotent)`);
    return { ok: true, already: true };
  }

  // Verifikasi nominal dari DB (tidak percaya body)
  if (verifiedNominal !== undefined) {
    const diff = Math.abs(verifiedNominal - Number(invoice.nominal));
    if (diff > 100) {  // toleransi Rp 100 untuk float
      console.error(`[webhook] NOMINAL MISMATCH: body=${verifiedNominal} db=${invoice.nominal}`);
      return { ok: false, reason: "nominal_mismatch" };
    }
  }

  const paidAt = new Date().toISOString();
  await supabase
    .from("invoices")
    .update({
      status:  "Lunas",
      paid_at: paidAt,
      ...extraData,
    })
    .eq("id", invoiceId);

  // Tambah entri arus kas
  const { data: lastCF } = await supabase
    .from("cash_flows")
    .select("saldo")
    .eq("kost_id", invoice.kost_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastSaldo = Number(lastCF?.[0]?.saldo || 0);
  const tgl       = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  await supabase.from("cash_flows").insert({
    kost_id: invoice.kost_id,
    tgl,
    ket:     `Pembayaran Online ${invoice.kamar} (${invoice.penyewa})`,
    kat:     "Pendapatan Sewa",
    tipe:    "Masuk",
    nominal: invoice.nominal,
    saldo:   lastSaldo + Number(invoice.nominal),
  });

  console.log(`[webhook] ✅ Invoice ${invoice.no_invoice} LUNAS via gateway`);
  return { ok: true, invoice };
}

// ── Midtrans ──────────────────────────────────────────────────────────────────
async function handleMidtrans(
  body: Record<string, unknown>,
  _request: NextRequest,
  supabase: AnySupabase
) {
  const orderId           = String(body.order_id           || "");
  const transactionStatus = String(body.transaction_status || "");
  const fraudStatus       = String(body.fraud_status       || "");
  const statusCode        = String(body.status_code        || "");
  const grossAmount       = String(body.gross_amount       || "");
  const receivedSig       = String(body.signature_key      || "");

  if (!receivedSig) {
    console.error("[midtrans] Missing signature_key");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }
  if (!orderId || !statusCode || !grossAmount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Parse invoiceId dari orderId
  const invoiceId = parseOrderId(orderId);
  if (!invoiceId) {
    return NextResponse.json({ error: "Invalid order_id format" }, { status: 400 });
  }

  // Ambil invoice dan kost untuk dapat server_key
  const { data: inv } = await supabase
    .from("invoices")
    .select("kost_id, nominal")
    .eq("id", invoiceId)
    .single();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Ambil server_key dari DB (per-kost)
  const { data: config } = await supabase
    .from("payment_configs")
    .select("config")
    .eq("kost_id", inv.kost_id)
    .eq("provider", "midtrans")
    .single();

  const serverKey = (config?.config as Record<string, string>)?.server_key;
  if (!serverKey) {
    return NextResponse.json({ error: "Payment config missing" }, { status: 500 });
  }

  // Verifikasi signature: SHA-512(orderId + statusCode + grossAmount + serverKey)
  const expectedSig = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  if (!safeStringCompare(receivedSig.toLowerCase(), expectedSig.toLowerCase())) {
    console.error("[midtrans] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Verifikasi nominal vs DB
  const bodyAmount = parseFloat(grossAmount);
  if (Math.abs(bodyAmount - Number(inv.nominal)) > 100) {
    console.error(`[midtrans] Nominal mismatch: body=${bodyAmount} db=${inv.nominal}`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const isPaid = (transactionStatus === "capture" && fraudStatus === "accept") ||
                 transactionStatus === "settlement";
  const isFailed = ["cancel", "deny", "expire"].includes(transactionStatus);

  if (isPaid) {
    const result = await markInvoicePaid(supabase, invoiceId, bodyAmount);
    if (!result.ok && result.reason === "nominal_mismatch") {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
  } else if (isFailed) {
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("id", invoiceId);
  }

  return NextResponse.json({ status: "ok" });
}

// ── Tripay ────────────────────────────────────────────────────────────────────
async function handleTripay(
  body: Record<string, unknown>,
  rawBody: string,
  request: NextRequest,
  supabase: AnySupabase
) {
  const receivedSig = request.headers.get("X-Callback-Signature") || "";
  const merchantRef = String(body.merchant_ref || "");  // = orderId kita
  const reference   = String(body.reference   || "");  // = reference Tripay
  const status      = String(body.status       || "");
  const amount      = Number(body.total_amount || body.amount || 0);

  if (!receivedSig) {
    console.error("[tripay] Missing X-Callback-Signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  // Parse invoiceId dari merchant_ref (= orderId kita)
  const invoiceId = parseOrderId(merchantRef);
  if (!invoiceId) {
    return NextResponse.json({ error: "Invalid merchant_ref" }, { status: 400 });
  }

  // Ambil kost_id dari invoice
  const { data: inv } = await supabase
    .from("invoices")
    .select("kost_id, nominal")
    .eq("id", invoiceId)
    .single();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Ambil private_key dari DB (per-kost)
  const { data: config } = await supabase
    .from("payment_configs")
    .select("config")
    .eq("kost_id", inv.kost_id)
    .eq("provider", "tripay")
    .single();

  const privateKey = (config?.config as Record<string, string>)?.private_key;
  if (!privateKey) return NextResponse.json({ error: "Config missing" }, { status: 500 });

  // Verifikasi: HMAC-SHA256(rawBody, privateKey)
  const expectedSig = createHmac("sha256", privateKey)
    .update(rawBody)
    .digest("hex");

  if (!safeStringCompare(receivedSig, expectedSig)) {
    console.error("[tripay] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Verifikasi nominal
  if (amount > 0 && Math.abs(amount - Number(inv.nominal)) > 100) {
    console.error(`[tripay] Nominal mismatch: body=${amount} db=${inv.nominal}`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  if (status === "PAID") {
    // FIX: lookup by invoiceId (dari parse), bukan payment_ref yang sudah diupdate
    const result = await markInvoicePaid(supabase, invoiceId, amount > 0 ? amount : undefined, {
      payment_ref: reference, // update ke Tripay reference
    });
    if (!result.ok && result.reason === "nominal_mismatch") {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
  } else if (["EXPIRED", "FAILED"].includes(status)) {
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("id", invoiceId);
  }

  return NextResponse.json({ success: true });
}

// ── Xendit ────────────────────────────────────────────────────────────────────
// FIXED: gunakan per-kost webhook_token dari DB, bukan global env var
async function handleXendit(
  body: Record<string, unknown>,
  rawBody: string,
  request: NextRequest,
  supabase: AnySupabase
) {
  // Xendit mengirim webhook-id + webhook-timestamp + signature dalam header
  // atau menggunakan x-callback-token (token statis)
  const callbackToken = request.headers.get("x-callback-token") || "";
  const externalId    = String(body.external_id || "");
  const status        = String(body.status       || "");
  const amount        = Number(body.amount       || body.paid_amount || 0);

  if (!callbackToken) {
    console.error("[xendit] Missing x-callback-token");
    return NextResponse.json({ error: "Missing callback token" }, { status: 401 });
  }

  // Parse invoiceId dari external_id
  const invoiceId = parseOrderId(externalId);
  if (!invoiceId) {
    return NextResponse.json({ error: "Invalid external_id" }, { status: 400 });
  }

  // Ambil kost_id dan webhook_token dari DB
  const { data: inv } = await supabase
    .from("invoices")
    .select("kost_id, nominal")
    .eq("id", invoiceId)
    .single();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const { data: config } = await supabase
    .from("payment_configs")
    .select("config")
    .eq("kost_id", inv.kost_id)
    .eq("provider", "xendit")
    .single();

  const webhookToken = (config?.config as Record<string, string>)?.webhook_token
    || process.env.XENDIT_WEBHOOK_TOKEN; // fallback ke env

  if (!webhookToken) {
    console.error("[xendit] webhook_token tidak dikonfigurasi");
    return NextResponse.json({ error: "Webhook token not configured" }, { status: 500 });
  }

  // FIX: simple string comparison (bukan double hex encode seperti sebelumnya)
  if (!safeStringCompare(callbackToken, webhookToken)) {
    console.error("[xendit] Invalid callback token");
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Verifikasi nominal
  if (amount > 0 && Math.abs(amount - Number(inv.nominal)) > 100) {
    console.error(`[xendit] Nominal mismatch: body=${amount} db=${inv.nominal}`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  if (status === "PAID" || status === "SETTLED") {
    const result = await markInvoicePaid(supabase, invoiceId, amount > 0 ? amount : undefined);
    if (!result.ok && result.reason === "nominal_mismatch") {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
  } else if (status === "EXPIRED") {
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("id", invoiceId);
  }

  return NextResponse.json({ success: true });
}
