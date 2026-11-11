import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST /api/booking/create
 * Endpoint publik — tidak butuh auth (dipanggil dari halaman kost publik)
 *
 * Body: { kostId, kamar, nama, phone, email, noKtp, nominal, nominalAsli, refCode, metode }
 *
 * LOGIKA NOMINAL UNIK:
 * - nominal = harga + 3 digit acak (100-999)
 * - Misal: harga Rp 1.500.000 → nominal Rp 1.500.347
 * - Admin verifikasi dengan melihat nominal di mutasi rekening/QRIS
 * - 3 digit terakhir = identitas unik per booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kostId, kamar, nama, phone, email, noKtp, nominal, nominalAsli, refCode, metode } = body;

    if (!kostId || !kamar || !nama || !phone || !nominal || !refCode) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Validasi kost ada
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: kost } = await supabase
      .from("kost_profiles")
      .select("id, nama, telepon")
      .eq("id", kostId)
      .single();

    if (!kost) return NextResponse.json({ error: "Kost tidak ditemukan" }, { status: 404 });

    // Cek kamar masih tersedia
    const { data: room } = await supabase
      .from("rooms")
      .select("id, status, harga")
      .eq("kost_id", kostId)
      .eq("nomor", kamar)
      .single();

    if (!room) return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });
    if (room.status !== "Kosong") {
      return NextResponse.json({ error: "Maaf, kamar ini sudah tidak tersedia saat ini." }, { status: 409 });
    }

    // Validasi nominal masuk akal (harga + max 1000)
    if (nominal < room.harga || nominal > room.harga + 1000) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
    }

    // Simpan booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        kost_id:      kostId,
        kamar,
        nama:         nama.trim(),
        phone:        phone.trim(),
        email:        email || null,
        no_ktp:       noKtp || null,
        nominal,
        nominal_asli: nominalAsli,
        ref_code:     refCode,
        metode:       metode || "QRIS",
        status:       "Menunggu",
      })
      .select("id, ref_code")
      .single();

    if (bookingError) {
      console.error("[booking/create]", bookingError.message);
      return NextResponse.json({ error: "Gagal menyimpan booking" }, { status: 500 });
    }

    // Kirim notif WA ke admin kost (jika bot aktif)
    const botUrl = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "");
    const botSecret = process.env.NOTIFICATION_BOT_SECRET;
    if (botUrl && botSecret && kost.telepon) {
      const adminPhone = kost.telepon.replace(/[^0-9]/g, "").replace(/^0/, "62");
      const msg =
        `🏠 *Booking Baru!*\n*${kost.nama}*\n\n` +
        `Kamar: *${kamar}*\n` +
        `Nama: *${nama}*\n` +
        `HP: ${phone}\n` +
        `Metode: ${metode}\n` +
        `Nominal: *Rp ${nominal.toLocaleString("id-ID")}*\n` +
        `Kode: \`${refCode}\`\n\n` +
        `Konfirmasi di dashboard admin.`;

      fetch(`${botUrl}/api/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${botSecret}` },
        body: JSON.stringify({ phone: adminPhone, message: msg, kostId }),
      }).catch(() => {}); // silent fail — notif tidak blocking
    }

    return NextResponse.json({
      success:  true,
      bookingId: booking.id,
      refCode:   booking.ref_code,
      nominal,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[booking/create]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
