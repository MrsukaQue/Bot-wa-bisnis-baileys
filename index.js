const {
  makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");

const BOT_NAME = "TOKO KAMU";
const OWNER_JID = "6285721782120@s.whatsapp.net";
const usePairingCode = true;

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

const keluhanState = {};

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
    if (!msg.message || msg.key.fromMe || msg.message.protocolMessage) return;

    const senderJid = msg.key.remoteJid;
    const sender = senderJid.replace("@s.whatsapp.net", "");
    const reply = (pesan) =>
      sock.sendMessage(senderJid, { text: pesan }, { quoted: msg });

    let text = "";
    if (msg.message.conversation) text = msg.message.conversation;
    else if (msg.message.extendedTextMessage?.text)
      text = msg.message.extendedTextMessage.text;
    else if (msg.message.imageMessage?.caption)
      text = msg.message.imageMessage.caption;
    else if (msg.message.videoMessage?.caption)
      text = msg.message.videoMessage.caption;

    // Deteksi foto bukti transfer/pemesanan
    if (msg.message.imageMessage?.caption) {
      const caption = msg.message.imageMessage.caption.toLowerCase();
      if (caption.includes("pemesanan") || caption.includes("transfer")) {
        await sock.sendMessage(OWNER_JID, { forward: msg });
        console.log(
          "📨 Foto dengan caption pemesanan/transfer dikirim ke admin."
        );
        await reply(
          "✅ Bukti sudah dikirim ke admin. Mohon tunggu konfirmasi ya!"
        );
        return;
      }
    }

    // MODE KELUHAN (bukan perintah)
    if (keluhanState[senderJid] && !text?.startsWith("/")) {
      try {
        await sock.sendMessage(OWNER_JID, {
          text: `📩 *Keluhan Baru dari* wa.me/${sender}\n\n${text}`,
        });
        await reply("✅ Keluhan kamu telah dikirim ke admin. Terima kasih!");
        delete keluhanState[senderJid];
      } catch (err) {
        console.error("❌ Gagal kirim keluhan:", err);
        await reply("❌ Gagal mengirim keluhan. Silakan coba lagi.");
      }
      return;
    }

    if (!text || !text.startsWith("/")) return;

    const command = text.trim().toLowerCase();
    console.log(chalk.yellow(`📥 Pesan dari ${sender}: ${command}`));

    switch (command) {
      case "/start":
        reply(
          `✨ Selamat datang di *${BOT_NAME}*!\nSaya adalah Asisten Virtual yang siap membantu kamu 24/7.\n\nKetik */menu* untuk melihat semua fitur yang tersedia.`
        );
        break;
      case "/menu":
        reply(
          `╭───〔 *📋 MENU UTAMA - ${BOT_NAME}* 〕───╮\n` +
            `│\n` +
            `│  🛍️ *Info & Pemesanan*\n` +
            `│  • /produk - Lihat katalog\n` +
            `│  • /pemesanan - Format order\n` +
            `│  • /pembayaran - Info pembayaran\n` +
            `│  • /cekpesanan - Cek status pesanan\n` +
            `│\n` +
            `│  🛠️ *Layanan Pelanggan*\n` +
            `│  • /hubungics - Kontak admin\n` +
            `│  • /keluhan - Ajukan keluhan\n` +
            `│  • /keluar - Selesai\n` +
            `│\n` +
            `│  🎉 *Zona Fun*\n` +
            `│  • /fun - Menu hiburan\n` +
            `│\n` +
            `│  ❓ *Bantuan*\n` +
            `│  • /help\n` +
            `╰────────────────────────────╯`
        );
        break;
      case "/produk":
        reply(
          "📦 Katalog produk kami bisa dicek di: https://linktokatalog.com"
        );
        break;
      case "/pemesanan":
        reply(
          `🛒 *Format Pemesanan:*\n` +
            `Nama:\nAlamat:\nNo HP:\nProduk:\nUkuran/Varian:\nJumlah:\nPembayaran:`
        );
        break;
      case "/pembayaran":
        reply(
          `💳 *Pembayaran:*\n` +
            `• BCA - 1234567890 a.n. ${BOT_NAME}\n` +
            `• DANA - 081234567890\n\n` +
            `Kirim bukti ke admin setelah transfer.`
        );
        break;
      case "/cekpesanan":
        reply(
          "🔍 Cek pesananmu langsung di WhatsApp admin:\nhttps://wa.me/6285721782120"
        );
        break;
      case "/hubungics":
        reply("📞 Hubungi admin kami:\nhttps://wa.me/6285721782120");
        break;
      case "/keluar":
        reply(`🙏 Terima kasih telah menghubungi *${BOT_NAME}*. Sampai jumpa!`);
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
      case "/help":
        reply("❓ Gunakan */menu* untuk melihat semua fitur yang tersedia.");
        break;
      case "/keluhan":
        keluhanState[senderJid] = true;
        reply(
          `🗣️ Silakan ketik keluhan kamu langsung di chat ini.\nFormat:\nNama:\nNo Pesanan:\nKeluhan:\n\n` +
            `Setelah kamu kirim, keluhan ini akan diteruskan ke admin.`
        );
        break;
      default:
        reply(
          "⚠️ Perintah tidak dikenali. Gunakan */menu* untuk melihat opsi yang tersedia."
        );
        break;
    }
  });
}

connectBot();
