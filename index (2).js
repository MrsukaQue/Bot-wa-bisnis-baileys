const fs = require('fs');
const {
  makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");

const BOT_NAME = "Toko Acumalaka";
const OWNER_JID = "6285721782120@s.whatsapp.net";
const usePairingCode = true;

const gombalan_list = [
  "Kamu tuh seperti bintang, selalu bersinar dalam gelap.",
  "Aku gak butuh GPS, karena aku udah tahu jalan ke hatimu.",
  "Kamu tuh kayak senja, selalu indah walau kadang hilang.",
  "Jika kamu jadi masalah, aku rela jadi solusi.",
  "Aku berharap kamu adalah salah satu dari 7 keajaiban dunia, supaya aku bisa selalu melihat keajaiban setiap harinya.",
];

const tebakan_list = [
  "Apa yang lebih besar dari segalanya tapi bisa masuk ke dalam kotak? Jawabannya: Pikiranmu.",
  "Kucing apa yang suka banget ngegame? Jawabannya: Kucing komputer!",
  "Aku punya 4 kaki, tapi gak bisa berjalan. Siapa aku? Jawabannya: Meja.",
  "Kenapa burung tidak pernah bekerja? Karena mereka sudah terbang tinggi!",
  "Apa yang bisa terbang tanpa sayap, bisa menangis tanpa mata, dan bisa bergerak tanpa kaki? Jawabannya: Awan.",
];

const fakta_list = [
  "Fakta unik: Gurita memiliki 3 hati, satu untuk darah, dan dua untuk mengatur aliran darah ke tubuhnya.",
  "Fakta unik: Kuda dapat tidur berdiri, tapi mereka juga bisa tidur sambil berbaring.",
  "Fakta unik: Di Jepang, ada restoran yang hanya melayani pelanggan yang memakai masker kucing.",
  "Fakta unik: Lebah bisa mengenali wajah manusia.",
  "Fakta unik: Kucing memiliki lebih dari 20 jenis suara, sementara anjing hanya sekitar 10.",
];

const keluhanState = {};
const greetedUsers = {};
const blockedUsers = new Set();
const activeChats = {};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function randomReply(list, senderJid, sock, msg) {
  const randomItem = list[Math.floor(Math.random() * list.length)];
  await sock.sendMessage(senderJid, { text: randomItem }, { quoted: msg });
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

    // Log pesan yang diterima
    console.log(chalk.yellow(`📥 Pesan dari ${sender}: ${msg.message}`));

    if (blockedUsers.has(senderJid)) {
      return reply("🚫 Kamu telah diblokir oleh admin dan tidak dapat mengakses layanan ini.");
    }

    let text = "";
    if (msg.message.conversation) text = msg.message.conversation;
    else if (msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
    else if (msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;
    else if (msg.message.videoMessage?.caption) text = msg.message.videoMessage.caption;

    // Sambutan awal
    if (!greetedUsers[senderJid]) {
      greetedUsers[senderJid] = true;
      await delay(800);
      await reply("👋 Hai! Ketik */start* untuk memulai.");
    }

    // Tangani bukti pembayaran berupa foto
    if (msg.message.imageMessage) {
      const caption = msg.message.imageMessage.caption?.toLowerCase() || "";
      if (caption.includes("pembayaran")) {
        await sock.sendMessage(OWNER_JID, { forward: msg });
        console.log("📨 Bukti pembayaran dikirim ke admin.");
        await reply(
          "✅ Bukti pembayaran sudah dikirim ke admin. Mohon tunggu konfirmasi ya!"
        );
        return;
      }
    }

    // Fitur /keluhan
    if (text?.toLowerCase() === "/keluhan") {
      const keluhanId = Math.random().toString(36).substr(2, 8); // Generate a unique ID
      keluhanState[senderJid] = keluhanId; // Save the ID in keluhanState
      await reply(`🗣️ Silakan ketik keluhan kamu langsung di chat ini. Format:
Nama:
No Pesanan:
Keluhan:

Keluhan ini akan disimpan dengan ID: ${keluhanId}.
Admin dapat menanggapi keluhan kamu menggunakan perintah */tanggap ${keluhanId}*.`);
      return;
    }

    // Tangani keluhan pengguna
    if (keluhanState[senderJid] && !text?.startsWith("/")) {
      try {
        const keluhanId = keluhanState[senderJid];
        const complaintText = `Keluhan ID: ${keluhanId}\nPengguna: wa.me/${sender}\nPesan: ${text}\n\n`;

        // Save the complaint to a .txt file
        const filePath = `./keluhan_${keluhanId}.txt`;
        fs.writeFileSync(filePath, complaintText, { flag: "w" }); // Write to file (overwrite if exists)

        await sock.sendMessage(OWNER_JID, {
          text: `📩 *Keluhan Baru dari* wa.me/${sender}
ID: ${keluhanId}
Pesan: ${text}

Keluhan ini telah disimpan di file: ${filePath}`,
        });

        await delay(1000);
        await reply(
          "✅ Keluhan kamu telah disimpan dan dikirim ke admin. Terima kasih!"
        );
        delete keluhanState[senderJid]; // Remove the keluhan state after saving
      } catch (err) {
        console.error("❌ Gagal menyimpan keluhan:", err);
        await delay(1000);
        await reply("❌ Gagal menyimpan keluhan. Silakan coba lagi.");
      }
      return;
    }

    // Fitur /pemesanan
    if (text?.toLowerCase() === "/pemesanan") {
      const pemesananId = Math.random().toString(36).substr(2, 8); // Generate a unique ID
      pemesananState[senderJid] = pemesananId; // Save the ID in pemesananState
      await reply(`🛒 Silakan ketik detail pesanan kamu dengan format berikut:
Nama:
Alamat:
No HP:
Produk:
Jumlah:
Pembayaran:

Pesanan ini akan disimpan dengan ID: ${pemesananId}.
Admin dapat mengonfirmasi pesanan kamu menggunakan perintah */accept ${pemesananId}*.`);
      return;
    }

    // Tangani detail pesanan pengguna
    if (pemesananState[senderJid] && !text?.startsWith("/")) {
      try {
        const pemesananId = pemesananState[senderJid];
        const orderText = `Pesanan ID: ${pemesananId}\nPengguna: wa.me/${sender}\nDetail Pesanan:\n${text}\n\n`;

        // Save the order to a .txt file
        const filePath = `./pemesanan_${pemesananId}.txt`;
        fs.writeFileSync(filePath, orderText, { flag: "w" }); // Write to file (overwrite if exists)

        await sock.sendMessage(OWNER_JID, {
          text: `📩 *Pesanan Baru dari* wa.me/${sender}
ID: ${pemesananId}
Detail Pesanan:
${text}

Pesanan ini telah disimpan di file: ${filePath}`,
        });

        await delay(1000);
        await reply(
          "✅ Pesanan kamu telah disimpan dan dikirim ke admin. Terima kasih!"
        );
        delete pemesananState[senderJid]; // Remove the pemesanan state after saving
      } catch (err) {
        console.error("❌ Gagal menyimpan pesanan:", err);
        await delay(1000);
        await reply("❌ Gagal menyimpan pesanan. Silakan coba lagi.");
      }
      return;
    }

    if (command === "/accept" && senderJid === OWNER_JID) {
      const target = Object.keys(activeChats)[0];
      if (target) {
        await sock.sendMessage(target, {
          text: "✅ Pesanan kamu sudah dikonfirmasi dan sedang diproses.",
        });
        console.log(`📦 Pesanan dari ${target} telah diterima.`);
        delete activeChats[target];
        await reply("✅ Pesanan telah diterima dan sesi ditutup.");
      } else {
        await reply("❌ Tidak ada sesi aktif untuk diterima.");
      }
      return;
    }

    if (command === "/kirim" && senderJid === OWNER_JID) {
      const target = Object.keys(keluhanState)[0];
      if (target) {
        await sock.sendMessage(target, {
                      text: "📦 Barang kamu sedang dalam perjalanan. Terima kasih sudah belanja!",
        });
        console.log(`📦 Notifikasi pengiriman dikirim ke ${target}.`);
        await reply("✅ Notifikasi pengiriman dikirim ke pembeli.");
      } else {
        await reply("❌ Tidak ada pesanan aktif.");
      }
      return;
    }

    // ========== ADMIN & USER COMMANDS ==========
    if (command === "/admin" && senderJid === OWNER_JID) {
      return reply(`🛠️ *Command Admin:*
• /terhubung - Menanggapi pengguna
• /tanggapi - Tanggapi keluhan pengguna
• /say [pesan] - Kirim pesan ke pembeli
• /block - Blokir pembeli
• /accept - Terima pesanan
• /kirim - Konfirmasi pengiriman`);
    }

    if (command === "/terhubung" && senderJid === OWNER_JID) {
      const target = Object.keys(keluhanState)[0];
      if (target) {
        activeChats[target] = true;
        await reply(`🔗 Terhubung ke wa.me/${target.replace("@s.whatsapp.net", "")}`);
        await sock.sendMessage(target, {
          text: "📞 Admin telah bergabung ke obrolan untuk menanggapi kamu.",
        });
      } else {
        await reply("❌ Tidak ada keluhan aktif.");
      }
      return;
    }

    if (command.startsWith("/say") && senderJid === OWNER_JID) {
      const target = Object.keys(activeChats)[0];
      if (target) {
        const msgToSend = text.slice(5).trim();
        if (!msgToSend) return reply("❌ Format: /say [pesan]");
        await sock.sendMessage(target, { text: `📩 Admin: ${msgToSend}` });
        await reply("✅ Pesan dikirim.");
      } else {
        await reply("❌ Tidak ada sesi aktif.");
      }
      return;
    }

    if (command === "/block" && senderJid === OWNER_JID) {
      const target = Object.keys(activeChats)[0];
      if (target) {
        blockedUsers.add(target);
        delete keluhanState[target];
        delete activeChats[target];
        await sock.sendMessage(target, {
          text: "🚫 Kamu telah diblokir dari toko.",
        });
        await reply("✅ Pengguna diblokir.");
      } else {
        await reply("❌ Tidak ada sesi aktif.");
      }
      return;
    }

    switch (command) {
      case "/start":
        await delay(1000);
        reply(`✨ Selamat datang di *${BOT_NAME}*! Saya adalah Asisten Virtual yang siap membantu kamu 24/7.\nKetik */menu* untuk melihat semua fitur yang tersedia.`);
        break;
      case "/menu":
  await delay(1200);
  const menuImageBuffer = fs.readFileSync("./media/image.jpg"); // Replace with the path to your image
  await sock.sendMessage(senderJid, {
    image: menuImageBuffer,
    caption: `╭───〔 *📋 MENU UTAMA - ${BOT_NAME}* 〕───╮
│
│  🛍️ *Info & Pemesanan*
│  • /produk - Lihat katalog
│  • /pemesanan - Format order
│  • /pembayaran - Info pembayaran
│  • /cekpesanan - Cek status pesanan
│
│  🛠️ *Layanan Pelanggan*
│  • /hubungics - Kontak admin
│  • /keluhan - Ajukan keluhan
│  • /keluar - Selesai
│
│  🎉 *Zona Fun*
│  • /fun - Menu hiburan
│
│  ❓ *Bantuan*
│  • /help
╰────────────────────────────╯`,
  });
  break;
      case "/produk":
        await delay(900);
        reply("📦 Katalog produk kami bisa dicek di: https://linktokatalog.com");
        break;
      case "/pembayaran":
        await delay(900);
        reply(`💳 *Pembayaran:*\n• BCA - 1234567890 a.n. ${BOT_NAME}\n• DANA - 081234567890\n\nKirim bukti ke admin setelah transfer.`);
        break;
      case "/cekpesanan":
        await delay(900);
        reply("🔍 Cek pesananmu langsung di WhatsApp admin:\nhttps://wa.me/6285721782120");
        break;
      case "/hubungics":
        await delay(900);
        reply("📞 Hubungi admin kami:\nhttps://wa.me/6285721782120");
        break;
      case "/fun":
        await delay(900);
                reply("🎉 Zona Fun:\n• /tebakan\n• /gombal\n• /fakta");
        break;
      case "/tebakan":
        await randomReply(tebakan_list, senderJid, sock, msg);
        break;
      case "/gombal":
        await randomReply(gombalan_list, senderJid, sock, msg);
        break;
      case "/fakta":
        await randomReply(fakta_list, senderJid, sock, msg);
        break;
      case "/help":
        await delay(800);
        reply("❓ Gunakan */menu* untuk melihat semua fitur yang tersedia.");
        break;
      case "/keluhan":
  const keluhanId = Math.random().toString(36).substr(2, 8); // Generate a random unique ID
  keluhanState[senderJid] = keluhanId; // Save the ID in keluhanState
  await delay(1000);
  reply(`🗣️ Silakan ketik keluhan kamu langsung di chat ini.
Format:
Nama:
No Pesanan:
Keluhan:

Setelah kamu kirim, keluhan ini akan diteruskan ke admin dengan ID: ${keluhanId}.
Admin dapat menanggapi keluhan kamu menggunakan perintah */tanggap ${keluhanId}*.`);
  break;
      default:
        await delay(800);
        reply("⚠️ Perintah tidak dikenali. Gunakan */menu* untuk melihat opsi yang tersedia.");
        break;
    }
  });
}

connectBot();
