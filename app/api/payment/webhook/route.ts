import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

/**
 * POST /api/payment/webhook
 * Menerima notifikasi pembayaran dari Midtrans, Tripay, dan Xendit
 *
 * Query params:
 *   ?provider=midtrans|tripay|xendit
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

    if (provider === "midtrans") {
      return await handleMidtrans(body, supabase);
    }
    if (provider === "tripay") {
      const signature = request.headers.get("X-Callback-Signature") || "";
      return await handleTripay(body, signature, supabase);
    }
    if (provider === "xendit") {
      const token = request.headers.get("x-callback-token") || "";
      return await handleXendit(body, token, supabase);
    }

    return NextResponse.json({ error: "Provider tidak dikenal" }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Midtrans juga mengirim GET untuk verifikasi endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "KOSTKU Payment Webhook" });
}

// ── Helper: update invoice ke Lunas ──────────────────────────────────────────
async function markInvoicePaid(
  supabase: ReturnType<typeof createServiceClient>,
  paymentRef: string,
  extraData?: Record<string, unknown>
) {
  // Cari invoice berdasarkan payment_ref atau order_id
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, kost_id, nominal, kamar, penyewa, no_invoice, status")
    .eq("payment_ref", paymentRef)
    .single();

  if (error || !invoice) {
    console.error("[webhook] Invoice tidak ditemukan untuk ref:", paymentRef);
    return null;
  }

  if (invoice.status === "Lunas") {
    console.log("[webhook] Invoice sudah Lunas, skip:", paymentRef);
    return invoice;
  }

  const paidAt = new Date().toISOString();

  // Update invoice
  await supabase
    .from("invoices")
    .update({
      status:  "Lunas",
      paid_at: paidAt,
      ...extraData,
    })
    .eq("id", invoice.id);

  // Tambah entri arus kas
  const { data: cashFlows } = await supabase
    .from("cash_flows")
    .select("saldo")
    .eq("kost_id", invoice.kost_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastSaldo = (cashFlows?.[0]?.saldo as number) || 0;

  const tgl = new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

  await supabase.from("cash_flows").insert({
    kost_id: invoice.kost_id,
    tgl,
    ket:     `Pembayaran Online ${invoice.kamar} (${invoice.penyewa})`,
    kat:     "Pendapatan Sewa",
    tipe:    "Masuk",
    nominal: invoice.nominal,
    saldo:   lastSaldo + Number(invoice.nominal),
  });

  console.log(`[webhook] ✅ Invoice ${invoice.no_invoice} LUNAS — Rp ${invoice.nominal}`);
  return invoice;
}

// ── Midtrans Webhook ──────────────────────────────────────────────────────────
async function handleMidtrans(
  body: Record<string, unknown>,
  supabase: ReturnType<typeof createServiceClient>
) {
  const orderId        = body.order_id as string;
  const transactionStatus = body.transaction_status as string;
  const fraudStatus    = body.fraud_status as string;
  const statusCode     = body.status_code as string;
  const grossAmount    = body.gross_amount as string;

  // Verifikasi signature: SHA512(orderId + statusCode + grossAmount + serverKey)
  // Ambil server key dari database berdasarkan orderId prefix
  // Format orderId: KOSTKU-{invoiceId}-{timestamp}
  const parts = orderId.split("-");
  const invoiceId = parts[1];

  if (invoiceId) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("kost_id")
      .eq("id", invoiceId)
      .single();

    if (inv) {
      const { data: config } = await supabase
        .from("payment_configs")
        .select("config")
        .eq("kost_id", inv.kost_id)
        .eq("provider", "midtrans")
        .single();

      if (config) {
        const serverKey = (config.config as Record<string, string>).server_key;
        if (serverKey) {
          const expectedSig = require("crypto")
            .createHash("sha512")
            .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
            .digest("hex");

          const receivedSig = body.signature_key as string;
          if (receivedSig && receivedSig !== expectedSig) {
            console.error("[midtrans webhook] Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
          }
        }
      }
    }
  }

  const isPaid =
    (transactionStatus === "capture" && fraudStatus === "accept") ||
    transactionStatus === "settlement";

  if (isPaid) {
    await markInvoicePaid(supabase, orderId);
  } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
    await supabase
      .from("invoices")
      .update({ status: "Jatuh Tempo" })
      .eq("payment_ref", orderId);
    console.log(`[midtrans webhook] Invoice ${orderId} — status: ${transactionStatus}`);
  }

  return NextResponse.json({ status: "ok" });
}

// ── Tripay Webhook ────────────────────────────────────────────────────────────
async function handleTripay(
  body: Record<string, unknown>,
  receivedSignature: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  const reference  = body.reference as string;
  const merchantRef = body.merchant_ref as string;
  const status     = body.status as string;

  // Ambil private key dari config untuk verifikasi signature
  // merchant_ref = orderId = KOSTKU-{invoiceId}-{timestamp}
  const parts = merchantRef?.split("-");
  const invoiceId = parts?.[1];

  if (invoiceId && receivedSignature) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("kost_id")
      .eq("id", invoiceId)
      .single();

    if (inv) {
      const { data: config } = await supabase
        .from("payment_configs")
        .select("config")
        .eq("kost_id", inv.kost_id)
        .eq("provider", "tripay")
        .single();

      if (config) {
        const privateKey = (config.config as Record<string, string>).private_key;
        if (privateKey) {
          const expectedSig = createHmac("sha256", privateKey)
            .update(JSON.stringify(body))
            .digest("hex");
          if (receivedSignature !== expectedSig) {
            console.error("[tripay webhook] Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
          }
        }
      }
    }
  }

  if (status === "PAID") {
    await markInvoicePaid(supabase, merchantRef, { payment_ref: reference });
  } else if (["EXPIRED", "FAILED"].includes(status)) {
    await supabase
      .from("invoices")
      .update({ status: "Jatuh Tempo" })
      .eq("payment_ref", merchantRef);
  }

  return NextResponse.json({ success: true });
}

// ── Xendit Webhook ────────────────────────────────────────────────────────────
async function handleXendit(
  body: Record<string, unknown>,
  callbackToken: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  const externalId = body.external_id as string;
  const status     = body.status as string;

  // Verifikasi callback token
  if (callbackToken) {
    const xenditCallbackToken = process.env.XENDIT_WEBHOOK_TOKEN;
    if (xenditCallbackToken && callbackToken !== xenditCallbackToken) {
      return NextResponse.json({ error: "Invalid callback token" }, { status: 401 });
    }
  }

  if (status === "PAID" || status === "SETTLED") {
    await markInvoicePaid(supabase, externalId);
  } else if (status === "EXPIRED") {
    await supabase
      .from("invoices")
      .update({ status: "Jatuh Tempo" })
      .eq("payment_ref", externalId);
  }

  return NextResponse.json({ success: true });
}
