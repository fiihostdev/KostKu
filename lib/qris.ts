/**
 * KOSTKU QRIS Engine
 *
 * Mengubah QR Statis (tanpa nominal) menjadi QR Dinamis (dengan nominal).
 * Standar: EMVCo QRIS sesuai Peraturan Bank Indonesia.
 *
 * Format TLV (Tag-Length-Value):
 *   - Tag 00: Payload Format Indicator → "01"
 *   - Tag 01: Point of Initiation Method → "11" (statis) | "12" (dinamis)
 *   - Tag 26-51: Merchant Account Info (berisi QRIS string merchant)
 *   - Tag 52: Merchant Category Code
 *   - Tag 53: Transaction Currency → "360" (IDR)
 *   - Tag 54: Transaction Amount (opsional di statis, wajib di dinamis)
 *   - Tag 55: Tip or Convenience Indicator
 *   - Tag 59: Merchant Name
 *   - Tag 60: Merchant City
 *   - Tag 61: Postal Code
 *   - Tag 62: Additional Data Field
 *   - Tag 63: CRC (Checksum CRC16-CCITT)
 */

interface QRISTlv {
  tag: string;
  length: number;
  value: string;
}

// ── Parse QRIS string ke array TLV ───────────────────────────────────────────
export function parseQRIS(qrisString: string): QRISTlv[] {
  const result: QRISTlv[] = [];
  let pos = 0;

  while (pos < qrisString.length) {
    if (pos + 4 > qrisString.length) break;

    const tag    = qrisString.substring(pos, pos + 2);
    const lenStr = qrisString.substring(pos + 2, pos + 4);
    const length = parseInt(lenStr, 10);

    if (isNaN(length) || pos + 4 + length > qrisString.length) break;

    const value = qrisString.substring(pos + 4, pos + 4 + length);
    result.push({ tag, length, value });
    pos += 4 + length;
  }

  return result;
}

// ── Serialize array TLV kembali ke QRIS string ────────────────────────────────
export function serializeQRIS(tlvs: QRISTlv[]): string {
  return tlvs
    .map((t) => `${t.tag}${String(t.length).padStart(2, "0")}${t.value}`)
    .join("");
}

// ── Hitung CRC16-CCITT (0xFFFF) ───────────────────────────────────────────────
export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// ── Validasi apakah string adalah QRIS valid ─────────────────────────────────
export function isValidQRIS(qrisString: string): boolean {
  if (!qrisString || qrisString.length < 50) return false;

  // Harus diawali dengan "000201" (payload format indicator = 01)
  if (!qrisString.startsWith("000201")) return false;

  // Harus ada tag 63 (CRC) di akhir
  if (!qrisString.includes("6304")) return false;

  // Validasi CRC
  const crcPos = qrisString.lastIndexOf("6304");
  if (crcPos === -1) return false;

  const dataToCheck   = qrisString.substring(0, crcPos + 4); // termasuk "6304"
  const receivedCRC   = qrisString.substring(crcPos + 4, crcPos + 8).toUpperCase();
  const calculatedCRC = calculateCRC16(dataToCheck);

  return receivedCRC === calculatedCRC;
}

// ── Inject nominal ke QRIS statis → hasilkan QRIS dinamis ────────────────────
export function injectAmountToQRIS(qrisString: string, amount: number): string {
  // Bersihkan string
  const cleanQRIS = qrisString.trim().replace(/\s+/g, "");

  // Parse semua TLV
  const tlvs = parseQRIS(cleanQRIS);

  // 1. Ubah Point of Initiation Method: "11" (statis) → "12" (dinamis)
  const initMethod = tlvs.find((t) => t.tag === "01");
  if (initMethod) {
    initMethod.value  = "12";
    initMethod.length = 2;
  }

  // 2. Tambah/update Tag 54 (Transaction Amount)
  const amountStr = String(Math.round(amount)); // tanpa desimal
  const existingAmount = tlvs.find((t) => t.tag === "54");
  if (existingAmount) {
    existingAmount.value  = amountStr;
    existingAmount.length = amountStr.length;
  } else {
    // Insert setelah tag 53 (currency)
    const currencyIdx = tlvs.findIndex((t) => t.tag === "53");
    if (currencyIdx !== -1) {
      tlvs.splice(currencyIdx + 1, 0, {
        tag:    "54",
        length: amountStr.length,
        value:  amountStr,
      });
    } else {
      // Fallback: tambah sebelum CRC
      const crcIdx = tlvs.findIndex((t) => t.tag === "63");
      if (crcIdx !== -1) {
        tlvs.splice(crcIdx, 0, {
          tag:    "54",
          length: amountStr.length,
          value:  amountStr,
        });
      }
    }
  }

  // 3. Hapus CRC lama (akan dihitung ulang)
  const crcIdx = tlvs.findIndex((t) => t.tag === "63");
  if (crcIdx !== -1) tlvs.splice(crcIdx, 1);

  // 4. Serialize tanpa CRC
  const withoutCRC = serializeQRIS(tlvs);

  // 5. Hitung CRC baru: data = string + "6304"
  const dataForCRC = withoutCRC + "6304";
  const newCRC     = calculateCRC16(dataForCRC);

  // 6. Return QRIS lengkap dengan CRC baru
  return `${withoutCRC}6304${newCRC}`;
}

// ── Extract info merchant dari QRIS ──────────────────────────────────────────
export function extractQRISInfo(qrisString: string): {
  merchantName: string;
  merchantCity: string;
  isStatic: boolean;
  currentAmount?: number;
} {
  const tlvs = parseQRIS(qrisString);

  const merchantNameTlv = tlvs.find((t) => t.tag === "59");
  const merchantCityTlv = tlvs.find((t) => t.tag === "60");
  const initMethodTlv   = tlvs.find((t) => t.tag === "01");
  const amountTlv       = tlvs.find((t) => t.tag === "54");

  return {
    merchantName:  merchantNameTlv?.value || "Merchant",
    merchantCity:  merchantCityTlv?.value || "Indonesia",
    isStatic:      initMethodTlv?.value !== "12",
    currentAmount: amountTlv ? parseInt(amountTlv.value, 10) : undefined,
  };
}
