import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createHmac, createHash, timingSafeEqual } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = ReturnType<typeof createServiceClient<any>>;

/**
 * POST /api/payment/webhook
 *
 * SECURITY:
 * - Signature WAJIB — tidak ada header signature → 401 langsung
 * - timingSafeEqual untuk perbandingan signature (mencegah timing attack)
 * - Idempotency: invoice sudah Lunas → skip tanpa error
 * - Nominal di-verify server-side vs invoice (tidak percaya body)
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

    if (provider === "midtrans") return await handleMidtrans(body, rawBody, request, supabase);
    if (provider === "tripay")  return await handleTripay(body, rawBody, request, supabase);
    if (provider === "xendit")  return await handleXendit(body, request, supabase);

    return NextResponse.json({ error: "Provider tidak dikenal" }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook]", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "KOSTKU Payment Webhook" });
}

// ── Helper: safe string comparison (timing-safe) ──────────────────────────────
function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

// ── Helper: update invoice ke Lunas ───────────────────────────────────────────
async function markInvoicePaid(
  supabase: AnySupabase,
  paymentRef: string,
  extraData?: Record<string, unknown>
) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, kost_id, nominal, kamar, penyewa, no_invoice, status")
    .eq("payment_ref", paymentRef)
    .single();

  if (error || !invoice) {
    console.error("[webhook] Invoice tidak ditemukan:", paymentRef);
    // Kembalikan 200 agar provider tidak retry terus
    return null;
  }

  // Idempotency — sudah Lunas, tidak perlu proses ulang
  if (invoice.status === "Lunas") {
    return invoice;
  }

  const paidAt = new Date().toISOString();
  await supabase
    .from("invoices")
    .update({ status: "Lunas", paid_at: paidAt, ...extraData })
    .eq("id", invoice.id);

  // Tambah entri arus kas
  const { data: cashFlows } = await supabase
    .from("cash_flows")
    .select("saldo")
    .eq("kost_id", invoice.kost_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastSaldo = Number((cashFlows?.[0]?.saldo as number) || 0);
  const tgl = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  await supabase.from("cash_flows").insert({
    kost_id: invoice.kost_id,
    tgl,
    ket:     `Pembayaran Online ${invoice.kamar} (${invoice.penyewa})`,
    kat:     "Pendapatan Sewa",
    tipe:    "Masuk",
    nominal: invoice.nominal,
    saldo:   lastSaldo + Number(invoice.nominal),
  });

  console.log(`[webhook] ✅ Invoice ${invoice.no_invoice} LUNAS`);
  return invoice;
}

// ── Midtrans ──────────────────────────────────────────────────────────────────
async function handleMidtrans(
  body: Record<string, unknown>,
  _rawBody: string,
  _request: NextRequest,
  supabase: AnySupabase
) {
  const orderId           = (body.order_id as string) || "";
  const transactionStatus = (body.transaction_status as string) || "";
  const fraudStatus       = (body.fraud_status as string) || "";
  const statusCode        = (body.status_code as string) || "";
  const grossAmount       = (body.gross_amount as string) || "";
  const receivedSig       = (body.signature_key as string) || "";

  // Signature WAJIB
  if (!receivedSig) {
    console.error("[midtrans webhook] Missing signature_key");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }
  if (!orderId || !statusCode || !grossAmount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Format orderId: KOSTKU-{invoiceId}-{timestamp}
  // invoiceId adalah UUID yang mengandung '-', jadi ambil bagian antara "KOSTKU-" dan "-{timestamp}"
  // Timestamp = bagian terakhir setelah '-' terakhir (13 digit epoch)
  const kostKuPrefix = "KOSTKU-";
  if (!orderId.startsWith(kostKuPrefix)) {
    return NextResponse.json({ error: "Invalid order_id format" }, { status: 400 });
  }
  const withoutPrefix = orderId.slice(kostKuPrefix.length); // "{uuid}-{timestamp}"
  const lastDashIdx = withoutPrefix.lastIndexOf("-");
  const invoiceId = lastDashIdx > 0 ? withoutPrefix.slice(0, lastDashIdx) : "";

  if (!invoiceId || invoiceId.length < 36) {
    return NextResponse.json({ error: "Invalid order_id format" }, { status: 400 });
  }

  const { data: inv } = await supabase
    .from("invoices").select("kost_id, nominal").eq("id", invoiceId).single();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const { data: config } = await supabase
    .from("payment_configs").select("config")
    .eq("kost_id", inv.kost_id).eq("provider", "midtrans").single();

  const serverKey = (config?.config as Record<string, string>)?.server_key;
  if (!serverKey) {
    return NextResponse.json({ error: "Payment config missing" }, { status: 500 });
  }

  // Verify signature (timing-safe)
  const expectedSig = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  if (!safeCompare(receivedSig.toLowerCase(), expectedSig.toLowerCase())) {
    console.error("[midtrans webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Verify gross_amount vs invoice nominal (tidak percaya body)
  const bodyAmount = parseFloat(grossAmount);
  if (Math.abs(bodyAmount - Number(inv.nominal)) > 1) {
    console.error(`[midtrans webhook] Amount mismatch: body=${bodyAmount} invoice=${inv.nominal}`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const isPaid = (transactionStatus === "capture" && fraudStatus === "accept") ||
                 transactionStatus === "settlement";

  if (isPaid) {
    await markInvoicePaid(supabase, orderId);
  } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("payment_ref", orderId);
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
  const merchantRef = (body.merchant_ref as string) || "";
  const reference   = (body.reference as string) || "";
  const status      = (body.status as string) || "";

  // Signature WAJIB
  if (!receivedSig) {
    console.error("[tripay webhook] Missing X-Callback-Signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const parts     = merchantRef.startsWith("KOSTKU-")
    ? (() => { const wo = merchantRef.slice(7); const idx = wo.lastIndexOf("-"); return [merchantRef, idx > 0 ? wo.slice(0, idx) : ""]; })()
    : ["", ""];
  const invoiceId = parts[1];
  if (!invoiceId || invoiceId.length < 36) return NextResponse.json({ error: "Invalid merchant_ref" }, { status: 400 });

  const { data: inv } = await supabase
    .from("invoices").select("kost_id").eq("id", invoiceId).single();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const { data: config } = await supabase
    .from("payment_configs").select("config")
    .eq("kost_id", inv.kost_id).eq("provider", "tripay").single();

  const privateKey = (config?.config as Record<string, string>)?.private_key;
  if (!privateKey) return NextResponse.json({ error: "Config missing" }, { status: 500 });

  const expectedSig = createHmac("sha256", privateKey)
    .update(rawBody)
    .digest("hex");

  if (!safeCompare(receivedSig, expectedSig)) {
    console.error("[tripay webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (status === "PAID") {
    await markInvoicePaid(supabase, merchantRef, { payment_ref: reference });
  } else if (["EXPIRED", "FAILED"].includes(status)) {
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("payment_ref", merchantRef);
  }

  return NextResponse.json({ success: true });
}

// ── Xendit ────────────────────────────────────────────────────────────────────
async function handleXendit(
  body: Record<string, unknown>,
  request: NextRequest,
  supabase: AnySupabase
) {
  const callbackToken = request.headers.get("x-callback-token") || "";
  const externalId    = (body.external_id as string) || "";
  const status        = (body.status as string) || "";

  // Token WAJIB
  if (!callbackToken) {
    console.error("[xendit webhook] Missing x-callback-token");
    return NextResponse.json({ error: "Missing callback token" }, { status: 401 });
  }

  const xenditToken = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!xenditToken) {
    console.error("[xendit webhook] XENDIT_WEBHOOK_TOKEN not configured");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  if (!safeCompare(
    Buffer.from(callbackToken).toString("hex"),
    Buffer.from(xenditToken).toString("hex")
  )) {
    console.error("[xendit webhook] Invalid token");
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (status === "PAID" || status === "SETTLED") {
    await markInvoicePaid(supabase, externalId);
  } else if (status === "EXPIRED") {
    await supabase.from("invoices").update({ status: "Jatuh Tempo" }).eq("payment_ref", externalId);
  }

  return NextResponse.json({ success: true });
}
