import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const SERVICE = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/booking/confirm
 *
 * Auto-konfirmasi booking via nominal unik.
 * Dipanggil dari:
 *   1. Webhook QRIS/bank (jika ada integrasi notifikasi mutasi)
 *   2. Admin klik "Konfirmasi" manual di dashboard
 *   3. Penyewa submit nominal yang mereka transfer
 *
 * Body: { bookingId?, refCode?, nominal, kostId }
 *
 * Logika validasi:
 *   - Cari booking dengan nominal EXACT match + status Menunggu
 *   - Nominal unik = harga kamar + 3 digit acak (1/1000 kemungkinan collision)
 *   - Jika match → konfirmasi otomatis, buat penyewa + invoice Lunas
 *
 * GET /api/booking/confirm?token=xxx
 *   Deep link konfirmasi dari WA — admin klik link → auto confirm
 */

// ── Konfirmasi booking dan buat penyewa + invoice ─────────────────────────────
async function confirmBooking(bookingId: string, method: string) {
  const { data: b, error } = await SERVICE
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !b) return { ok: false, error: "Booking tidak ditemukan" };
  if (b.status === "Dikonfirmasi") return { ok: true, already: true };
  if (b.status !== "Menunggu") return { ok: false, error: "Booking tidak dalam status Menunggu" };

  // Update booking
  await SERVICE
    .from("bookings")
    .update({
      status:               "Dikonfirmasi",
      confirmed_method:     method,
      auto_confirmed_at:    new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    })
    .eq("id", bookingId);

  // Buat penyewa
  const mulaiSewa = new Date().toISOString().split("T")[0];
  const akhirSewa = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: tenant } = await SERVICE
    .from("tenants")
    .insert({
      kost_id:     b.kost_id,
      branch_id:   b.branch_id,
      nama:        b.nama,
      phone:       b.phone,
      email:       b.email,
      no_ktp:      b.no_ktp,
      kamar:       `Kamar ${b.kamar}`,
      mulai_sewa:  mulaiSewa,
      akhir_sewa:  akhirSewa,
      status_bayar:"Lunas",
      ktp_verified: false,
      created_at:  new Date().toISOString(),
    })
    .select("id")
    .single();

  // Update status kamar ke Terisi
  await SERVICE
    .from("rooms")
    .update({ status: "Terisi", penyewa: b.nama, updated_at: new Date().toISOString() })
    .eq("kost_id", b.kost_id)
    .eq("nomor", b.kamar);

  // Buat invoice Lunas
  const noInvoice = "INV-" + Date.now().toString(36).toUpperCase();
  const tgl       = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  await SERVICE.from("invoices").insert({
    kost_id:    b.kost_id,
    branch_id:  b.branch_id,
    no_invoice: noInvoice,
    penyewa:    b.nama,
    kamar:      `Kamar ${b.kamar}`,
    nominal:    b.nominal_asli,
    jatuh_tempo: tgl,
    metode:     b.metode,
    status:     "Lunas",
    created_at: new Date().toISOString(),
  });

  // Tambah arus kas
  const { data: lastCF } = await SERVICE
    .from("cash_flows")
    .select("saldo")
    .eq("kost_id", b.kost_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastSaldo = Number(lastCF?.[0]?.saldo || 0);
  await SERVICE.from("cash_flows").insert({
    kost_id: b.kost_id,
    tgl,
    ket:     `Booking Online ${b.nama} - Kamar ${b.kamar} [${method}]`,
    kat:     "Pendapatan Sewa",
    tipe:    "Masuk",
    nominal: b.nominal_asli,
    saldo:   lastSaldo + b.nominal_asli,
    created_at: new Date().toISOString(),
  });

  // Kirim WA konfirmasi ke penyewa
  const botUrl    = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "");
  const botSecret = process.env.NOTIFICATION_BOT_SECRET;
  if (botUrl && botSecret && b.phone) {
    const cleanPhone = b.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const msg =
      `✅ *Booking Dikonfirmasi!*\n\n` +
      `Halo *${b.nama}*, pembayaran Anda telah diterima.\n\n` +
      `🏠 Kamar: *${b.kamar}*\n` +
      `💰 Nominal: *Rp ${Number(b.nominal_asli).toLocaleString("id-ID")}*\n` +
      `📅 Mulai sewa: ${mulaiSewa}\n` +
      `🔖 Ref: \`${b.ref_code}\`\n\n` +
      `Selamat datang! Admin akan menghubungi Anda untuk info selanjutnya.`;
    fetch(`${botUrl}/api/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${botSecret}` },
      body: JSON.stringify({ phone: cleanPhone, message: msg, kostId: b.kost_id }),
    }).catch(() => {});
  }

  return { ok: true, tenantId: tenant?.id, bookingId };
}

// ── POST: auto-konfirmasi via nominal unik ────────────────────────────────────
export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "booking-confirm", RATE_LIMITS.MUTATION);
  if (rl) return rl;

  try {
    const body = await request.json();
    const { nominal, kostId, bookingId, refCode, source } = body;

    // ── Mode 1: Admin konfirmasi manual via bookingId ──────────────────────
    if (bookingId) {
      // Validasi bahwa request dari admin yang berhak (via session)
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: profile } = await supabase
        .from("kost_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 403 });

      // Pastikan booking milik kost ini
      const { data: booking } = await SERVICE
        .from("bookings").select("id, kost_id").eq("id", bookingId).maybeSingle();
      if (!booking || booking.kost_id !== profile.id) {
        return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
      }

      const result = await confirmBooking(bookingId, source || "manual_admin");
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ success: true, already: result.already });
    }

    // ── Mode 2: Auto-konfirmasi via nominal unik (dari sistem/webhook) ─────
    if (nominal && kostId) {
      // Validasi nominal reasonable
      if (nominal < 1000 || nominal > 100_000_000) {
        return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
      }

      // Cari booking dengan nominal exact match + status Menunggu
      let query = SERVICE
        .from("bookings")
        .select("*")
        .eq("kost_id", kostId)
        .eq("nominal", nominal)
        .eq("status", "Menunggu");

      if (refCode) query = query.eq("ref_code", refCode);

      const { data: bookings } = await query.limit(2);

      if (!bookings || bookings.length === 0) {
        return NextResponse.json({ error: "Booking tidak ditemukan untuk nominal ini" }, { status: 404 });
      }

      // Ambiguous — 2+ booking dengan nominal sama (sangat jarang tapi handle)
      if (bookings.length > 1 && !refCode) {
        return NextResponse.json({
          error: "Nominal ambigu — sertakan refCode untuk konfirmasi",
          count: bookings.length,
        }, { status: 409 });
      }

      const booking = bookings[0];
      const result  = await confirmBooking(booking.id, source || "nominal_match");
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

      return NextResponse.json({
        success:   true,
        bookingId: booking.id,
        nama:      booking.nama,
        kamar:     booking.kamar,
        already:   result.already,
      });
    }

    return NextResponse.json({ error: "Butuh bookingId atau nominal+kostId" }, { status: 400 });

  } catch (err) {
    console.error("[booking/confirm]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET: deep link konfirmasi dari WA (admin klik link) ───────────────────────
// URL: /api/booking/confirm?bookingId=xxx&token=yyy
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId") || "";
  const token     = searchParams.get("token")     || "";

  if (!bookingId || !token) {
    return new Response("Link konfirmasi tidak valid.", { status: 400, headers: { "Content-Type": "text/html" } });
  }

  try {
    // Verifikasi token: HMAC-SHA256(bookingId, BOOKING_SECRET)
    const { createHmac } = await import("crypto");
    const secret   = process.env.BOOKING_CONFIRM_SECRET || "kostku-secret-change-me";
    const expected = createHmac("sha256", secret).update(bookingId).digest("hex").slice(0, 16);

    if (token !== expected) {
      return new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2>❌ Link Tidak Valid</h2>
          <p>Token konfirmasi tidak sesuai.</p>
        </body></html>`,
        { status: 401, headers: { "Content-Type": "text/html" } }
      );
    }

    const result = await confirmBooking(bookingId, "wa_deeplink");

    if (!result.ok) {
      return new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2>⚠️ ${result.error}</h2>
          <p>Mungkin sudah dikonfirmasi sebelumnya atau booking sudah tidak ada.</p>
        </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    if (result.already) {
      return new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:40px;color:#059669">
          <h2>✅ Sudah Dikonfirmasi</h2>
          <p>Booking ini sudah dikonfirmasi sebelumnya.</p>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response(
      `<html><head><meta charset="utf-8"><title>Booking Dikonfirmasi</title></head>
       <body style="font-family:sans-serif;text-align:center;padding:40px;max-width:400px;margin:auto">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <h2 style="color:#059669">Booking Dikonfirmasi!</h2>
        <p style="color:#374151">Penyewa & invoice telah dibuat otomatis.</p>
        <p style="margin-top:24px">
          <a href="/admin/booking" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold">
            Buka Dashboard Admin
          </a>
        </p>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err) {
    console.error("[booking/confirm GET]", err);
    return new Response("Server error.", { status: 500 });
  }
}
