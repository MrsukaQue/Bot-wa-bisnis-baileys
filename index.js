const {
  makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");

// Konfigurasi awal
const BOT_NAME = "NAMA TOKO";
const usePairingCode = true;

// Data zona fun
const gombalan_list = [
  "❤️ Kamu itu kayak kopi, bikin jantung deg-degan.",
  "❤️ Aku nggak butuh peta, karena tujuanku selalu kamu.",
  "❤️ Kalau kamu bulan, aku mau jadi bintang biar selalu di dekatmu.",
  "❤️ Kamu punya peta? Soalnya aku nyasar di matamu.",
  "❤️ Kamu itu charger aku, kalau jauh lowbat rasanya.",
];
const tebakan_list = [
  "❓ Kenapa ayam nyebrang jalan? Karena mau ke seberang!",
  "❓ Kenapa komputer suka nyanyi? Karena punya RAM lah.",
  "❓ Ikan apa yang bisa nempel di dinding? Ikan lempel.",
  "❓ Kenapa gajah nggak bisa main komputer? Karena takut mouse.",
  "❓ Kenapa kursi nggak bisa lari? Karena dia duduk.",
];

// Fungsi input pairing code
async function question(prompt) {
  process.stdout.write(prompt);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question("", (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Fungsi utama koneksi
async function connectBot() {
  console.log(chalk.blue("🔌 Menghubungkan ke WhatsApp..."));

  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: !usePairingCode,
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    version: [2, 3000, 1015901307],
  });

  // Jika pairing code aktif dan belum login
  if (usePairingCode && !sock.authState.creds.registered) {
    const phoneNumber = await question("📱 Masukkan nomor dengan awalan 62: ");
    const code = await sock.requestPairingCode(phoneNumber.trim());
    console.log(chalk.green(`✅ Pairing Code: ${code}`));
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      console.log(chalk.green("🤖 Bot berhasil terhubung dan aktif!"));
    } else if (connection === "close") {
      console.log(chalk.red("❌ Koneksi terputus. Mengulang..."));
      connectBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    // DEBUG: Tampilkan isi mentah pesan
    console.log("📨 PESAN MASUK:");
    console.dir(msg.message, { depth: null });

    if (msg.key.fromMe) return;

    // Coba ambil teks dari berbagai jenis pesan
    let text = "";
    if (msg.message.conversation) text = msg.message.conversation;
    else if (msg.message.extendedTextMessage?.text)
      text = msg.message.extendedTextMessage.text;
    else if (msg.message.imageMessage?.caption)
      text = msg.message.imageMessage.caption;
    else if (msg.message.videoMessage?.caption)
      text = msg.message.videoMessage.caption;

    // DEBUG: Cek hasil parsing teks
    console.log("📩 Parsed Text:", text);

    if (!text) return;

    text = text.trim().toLowerCase();
    const reply = (pesan) =>
      sock.sendMessage(msg.key.remoteJid, { text: pesan }, { quoted: msg });

    switch (text) {
      case "/start":
        reply(
          `✨ Selamat datang di ${BOT_NAME}!\nSaya adalah Asisten Virtual yang siap bantu kamu 24/7.\n\nKetik /menu untuk melihat semua fitur yang tersedia.`
        );
        break;
      case "/menu":
        reply(
          `📋 MENU UTAMA - ${BOT_NAME}\n\n🛍️ Info & Pemesanan\n• /produk\n• /pemesanan\n• /pembayaran\n• /cekpesanan\n\n📞 Layanan Pelanggan\n• /hubungics\n• /keluhan\n• /keluar\n\n🎉 Zona Fun\n• /fun\n\n📷 Info Visual\n• /katalog\n• /logo\n\n❓ Bantuan\n• /help`
        );
        break;
      case "/produk":
        reply(
          "📦 Katalog produk kami bisa dicek di: https://linktokatalog.com"
        );
        break;
      case "/pemesanan":
        reply(
          `🛒 Format Pemesanan:\nNama:\nAlamat:\nNo HP:\nProduk:\nUkuran/Varian:\nJumlah:\nPembayaran:`
        );
        break;
      case "/pembayaran":
        reply(
          "💳 Pembayaran:\nBCA - 1234567890 a.n. NAMA TOKO\nDANA - 081234567890\nKirim bukti ke admin setelah transfer."
        );
        break;
      case "/cekpesanan":
        reply("🔍 Cek pesananmu di: https://wa.me/6285721782120");
        break;
      case "/hubungics":
        reply("📞 Hubungi admin: https://wa.me/6285721782120");
        break;
      case "/keluhan":
        reply(
          "🗣️ Sampaikan keluhan ke admin:\nhttps://wa.me/6285721782120?text=Halo+Admin,+saya+mau+keluhan+dengan+format+berikut%3A%0ANama%3A%0ANo+Pesanan%3A%0AKeluhan%3A"
        );
        break;
      case "/keluar":
        reply(`🙏 Terima kasih telah menghubungi ${BOT_NAME}. Sampai jumpa!`);
        break;
      case "/fun":
        reply("🎉 Zona Fun:\n• /tebakan\n• /gombal\n• /fakta");
        break;
      case "/tebakan":
        reply(tebakan_list[Math.floor(Math.random() * tebakan_list.length)]);
        break;
      case "/gombal":
        reply(gombalan_list[Math.floor(Math.random() * gombalan_list.length)]);
        break;
      case "/fakta":
        reply("📚 Fakta unik: Gurita punya 3 hati dan darahnya biru!");
        break;
      case "/katalog":
        reply("📖 Katalog tersedia dalam PDF. Hubungi admin untuk info.");
        break;
      case "/logo":
        reply("🏷️ Logo dapat diminta ke admin atau lihat di media sosial.");
        break;
      case "/help":
        reply("❓ Gunakan /menu untuk lihat semua perintah.");
        break;
      default:
        reply(
          "⚠️ Perintah tidak dikenali. Gunakan /menu untuk melihat opsi yang tersedia."
        );
        break;
    }
  });
}

connectBot();
