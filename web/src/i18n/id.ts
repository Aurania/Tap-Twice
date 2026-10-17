import type { StringKey } from "./en";

/** Bahasa Indonesia. Must have every key in en.ts (the type enforces it). */
export const id: Record<StringKey, string> = {
  "app.name": "Tap Twice",
  "app.tagline": "Tap sekali. Pikir dua kali.",

  "common.back": "Kembali",
  "common.close": "Tutup",
  "common.cancel": "Batal",
  "common.next": "Lanjut",
  "common.tryAgain": "Coba lagi",
  "common.backToHome": "Kembali ke beranda",
  "common.loading": "Memuat…",
  "common.optional": "opsional",

  "disclaimer.advice": "Tap Twice menampilkan biaya dan refleksi, bukan nasihat keuangan.",
  "disclaimer.ai": "AI bisa salah. Cek lagi angkanya.",

  "language.label": "Bahasa",
  "language.en": "EN",
  "language.id": "ID",

  "decide.buyIt": "Beli",
  "decide.save": "Simpan",
  "decide.futureMe": "Future Me",
  "decide.saveForLater": "Simpan dulu",

  "pay.inFull": "Bayar penuh",
  "pay.inFullDetail": "Tanpa biaya tambahan · tanpa jatuh tempo",
  "pay.paylaterMonths": "PayLater, {n} bulan",
  "pay.containsInterest": "Ada bunganya",

  "notice.lateTitle": "Hati-hati telat bayar",
  "notice.lateBody": "Telat bayar bisa tercatat di SLIK OJK dan memengaruhi pinjaman nanti, misalnya KPR.",

  "realTalk": "Ngobrol jujur",
  "field.counter": "{count}/{max}",
};
