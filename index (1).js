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

const pemesananState = {};
const spamTracker = {};
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

let text = "";
if (msg.message?.conversation) text = msg.message.conversation;
else if (msg.message?.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
else if (msg.message?.imageMessage?.caption) text = msg.message.imageMessage.caption;
else if (msg.message?.videoMessage?.caption) text = msg.message.videoMessage.caption;
      
      let nomor = msg.key.remoteJid.split("@")[0];

      if (blockedUsers[nomor]) return


    if (!spamTracker[nomor]) spamTracker[nomor] = { lastMessage: text, count: 1 };
    else if (spamTracker[nomor].lastMessage === text) {
      spamTracker[nomor].count++;
        const from = msg.key.remoteJid;

      if (spamTracker[nomor].count >= 10) {
        blockedUsers[nomor] = true;
        fs.writeFileSync('./blocked.json', JSON.stringify(blockedUsers, null, 2));
        await sock.sendMessage(from, { text: '🚫 Kamu telah diblokir karena mengirim spam berulang.' });
        return;
      }
    } else {
      spamTracker[nomor] = { lastMessage: text, count: 1 };
    }

    if (!text.startsWith('/')) return;

    const args = text.trim().split(/ +/);
    const command = args[0].toLowerCase();
  
    if (command === '/unblock') {
      if (msg.key.fromMe || nomor === 'ADMIN_NUMBER') {
        const target = args[1]?.replace(/[^0-9]/g, '');
        if (!target || !blockedUsers[target]) return conn.sendMessage(from, { text: '❌ Nomor tidak ditemukan di daftar blokir.' });
        delete blockedUsers[target];
        fs.writeFileSync('./blocked.json', JSON.stringify(blockedUsers, null, 2));
        return conn.sendMessage(from, { text: `✅ Nomor ${target} berhasil di-unblock.` });
      } else {
        return conn.sendMessage(from, { text: '❌ Hanya admin yang bisa membuka blokir.' });
      }
    }





    if (blockedUsers.has(senderJid)) {
      return reply("🚫 Kamu telah diblokir oleh admin dan tidak dapat mengakses layanan ini.");
    }



console.log(`📥 Pesan dari ${sender}: ${text || "[Tanpa Teks]"}`);








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




if (text.startsWith('/tanggapi')) {
  if (!isAdmin(sender)) return conn.sendMessage(sender, { text: "❌ Hanya admin yang bisa menanggapi pengaduan." });

  const [_, targetNumber, ...responseArr] = text.split(' ');
  const responseText = responseArr.join(' ');
  const targetJid = targetNumber + '@s.whatsapp.net';

  conn.sendMessage(targetJid, { text: `📣 Tanggapan dari Admin:\n\n${responseText}` });
  conn.sendMessage(sender, { text: `✅ Tanggapan terkirim ke ${targetNumber}` });
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
• /kirim - Konfirmasi pengiriman
- /addproduk - menambah produk`);
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

const produkFilePath = "./produk.json";

// Pastikan file produk.json ada
if (!fs.existsSync(produkFilePath)) {
  fs.writeFileSync(produkFilePath, JSON.stringify([])); // Buat file kosong
}

// Fungsi untuk membaca daftar produk
function getProdukList() {
  const rawData = fs.readFileSync(produkFilePath);
  return JSON.parse(rawData);
}

// Fungsi untuk menambahkan produk baru
function addProduk(namaProduk, harga) {
  const produkList = getProdukList();
  const produkBaru = {
    id: produkList.length + 1,
    nama: namaProduk,
    harga,
  };
  produkList.push(produkBaru);
  fs.writeFileSync(produkFilePath, JSON.stringify(produkList, null, 2)); // Simpan ke file
  return produkBaru;
}      
      
      
    switch (command) {
      case "/start":
  await delay(1000);
  const logoImageBuffer = fs.readFileSync("./media/logo.jpg"); // Replace with your logo image path
  const welcomeVoiceBuffer = fs.readFileSync("./media/welcome.mp3"); // Replace with your voice file path
  
  // Send logo with welcome text
  await sock.sendMessage(senderJid, {
    image: logoImageBuffer,
    caption: `✨ Selamat datang di *${BOT_NAME}*! Saya adalah Asisten Virtual yang siap membantu kamu 24/7.\nKetik */menu* untuk melihat semua fitur yang tersedia.`
  });

  // Send welcome voice
  await sock.sendMessage(senderJid, {
    audio: welcomeVoiceBuffer,
    mimetype: "audio/mp4", // or use "audio/mpeg" based on your file type
  });
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
    // Tampilkan daftar produk ke pengguna
    const produkList = getProdukList();
    if (produkList.length === 0) {
      await reply("📦 Saat ini belum ada produk yang tersedia.");
    } else {
      let produkMessage = "📦 *Daftar Produk Tersedia:*\n\n";
      produkList.forEach((produk) => {
        produkMessage += `ID: ${produk.id}\nNama: ${produk.nama}\nHarga: Rp ${produk.harga}\n\n`;
      });
      await reply(produkMessage);
    }
    break;
    case "/pembayaran":
  await delay(900);

  const qrisImageBuffer = fs.readFileSync("./media/qris.jpg"); // Gambar QRIS jika ada
  const pembayaranMessage = `
💳 *Informasi Pembayaran Toko ${BOT_NAME}:*

1. *Bank Mandiri*
   • Nomor Rekening: 1234567890
   • A.N.: Toko Acumalaka

2. *DANA*
   • Nomor: 081234567890
   • A.N.: Toko Acumalaka

3. *OVO*
   • Nomor: 081987654321
   • A.N.: Toko Acumalaka

4. *QRIS*
   • Scan kode QR di bawah untuk melakukan pembayaran.

Mohon untuk mengirim bukti pembayaran berupa foto setelah transfer agar pesanan dapat diproses. Terima kasih 🙏.
  `;

  // Kirim pesan informasi pembayaran
  await sock.sendMessage(senderJid, { text: pembayaranMessage });

  // Kirim gambar QRIS jika tersedia
  await sock.sendMessage(senderJid, {
    image: qrisImageBuffer,
    caption: "💳 *QRIS - Scan untuk Membayar*",
  });
  break;

case "/bukti":
  if (msg.message.imageMessage) {
    const senderPhone = senderJid.split("@")[0];
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const fileName = `bukti_${senderPhone}_${timestamp}.jpg`;

    // Simpan file foto bukti pembayaran
    const mediaBuffer = await sock.downloadMediaMessage(msg.message.imageMessage);
    fs.writeFileSync(`./payments/${fileName}`, mediaBuffer);

    // Kirim konfirmasi ke pengguna
    await sock.sendMessage(senderJid, {
      text: `✅ Bukti pembayaran telah diterima dan disimpan dengan nama: ${fileName}. Mohon tunggu konfirmasi dari admin.`,
    });

    // Kirim notifikasi ke admin
    await sock.sendMessage(OWNER_JID, {
      text: `📩 Bukti pembayaran baru telah diterima dari wa.me/${senderPhone}. File disimpan dengan nama: ${fileName}`,
    });
  } else {
    await sock.sendMessage(senderJid, {
      text: "⚠️ Harap kirimkan bukti pembayaran berupa foto.",
    });
  }
  break;
 
          case "/pemesanan":
    const pemesananId = Math.random().toString(36).substr(2, 8); // Generate ID unik
    pemesananState[senderJid] = { id: pemesananId, isFilling: true };

    let pesan = `🛒 Silakan isi format pemesanan dengan detail berikut:\n\n`;
    pesan += `1. ID Produk (Pisahkan dengan koma jika lebih dari satu):\n2. Jumlah (Pisahkan dengan koma sesuai ID produk):\n3. Alamat Pengiriman:\n4. Metode Pembayaran:\n\nContoh:\nID Produk: 1,2\nJumlah: 3,1\nAlamat: Jl. Mawar No. 123, Jakarta\nMetode Pembayaran: Transfer Bank Mandiri\n\n*ID Pesanan Anda: ${pemesananId}*\n\n📦 Daftar Produk:\n`;

    produkList.forEach((produk) => {
      pesan += `ID: ${produk.id} | Nama: ${produk.nama} | Harga: Rp ${produk.harga}\n`;
    });

    await reply(pesan);

    // Tangani detail pemesanan
    if (pemesananState[senderJid] && pemesananState[senderJid].isFilling && !text?.startsWith("/")) {
      try {
        const pemesananId = pemesananState[senderJid].id;
        const lines = text.split("\n");
        const idProdukLine = lines.find((line) => line.startsWith("ID Produk:"));
        const jumlahLine = lines.find((line) => line.startsWith("Jumlah:"));
        const alamatLine = lines.find((line) => line.startsWith("Alamat:"));
        const pembayaranLine = lines.find((line) => line.startsWith("Metode Pembayaran:"));

        if (!idProdukLine || !jumlahLine || !alamatLine || !pembayaranLine) {
          await reply("⚠️ Format tidak lengkap. Silakan isi semua detail yang diminta.");
          return;
        }

        // Parse input
        const idProdukInput = idProdukLine.replace("ID Produk:", "").trim();
        const jumlahInput = jumlahLine.replace("Jumlah:", "").trim();
        const alamat = alamatLine.replace("Alamat:", "").trim();
        const metodePembayaran = pembayaranLine.replace("Metode Pembayaran:", "").trim();

        const idProdukList = idProdukInput.split(",").map((id) => parseInt(id.trim()));
        const jumlahList = jumlahInput.split(",").map((jml) => parseInt(jml.trim()));

        if (idProdukList.length !== jumlahList.length) {
          await reply("⚠️ Jumlah ID Produk dan Jumlah Barang tidak sesuai. Harap periksa kembali.");
          return;
        }

        const produkList = getProdukList();
        let totalBelanja = 0;
        let detailPesanan = `🛒 *Detail Pesanan Anda:*\n\n`;

        idProdukList.forEach((idProduk, index) => {
          const produk = produkList.find((p) => p.id === idProduk);
          if (produk) {
            const subtotal = produk.harga * jumlahList[index];
            totalBelanja += subtotal;
            detailPesanan += `- ${produk.nama} (x${jumlahList[index]}): Rp ${subtotal}\n`;
          } else {
            detailPesanan += `- Produk dengan ID ${idProduk} tidak ditemukan.\n`;
          }
        });

        detailPesanan += `\n📍 Alamat Pengiriman: ${alamat}\n💳 Metode Pembayaran: ${metodePembayaran}\n\n💰 *Total Belanja: Rp ${totalBelanja}*\n\n✅ Pesanan Anda telah disimpan dengan ID: ${pemesananId}. Mohon tunggu konfirmasi dari admin.`;

        // Simpan detail pesanan ke file
        const orderText = `Pesanan ID: ${pemesananId}\nPengguna: wa.me/${sender}\nDetail Pesanan:\n${detailPesanan}\n\n`;
        const filePath = `./pemesanan_${pemesananId}.txt`;
        fs.writeFileSync(filePath, orderText, { flag: "w" });

        // Kirim notifikasi ke admin
        await sock.sendMessage(OWNER_JID, {
          text: `📩 *Pesanan Baru dari* wa.me/${sender}\nID: ${pemesananId}\n\n${detailPesanan}\n\nPesanan ini telah disimpan di file: ${filePath}`,
        });

        await delay(1000);
        await reply(detailPesanan);
        delete pemesananState[senderJid]; // Hapus state setelah pesanan selesai
      } catch (err) {
        console.error("❌ Gagal memproses pesanan:", err);
        await delay(1000);
        await reply("❌ Gagal memproses pesanan. Silakan coba lagi.");
      }
    }
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
case "/keluar":
  await delay(1000);
  const exitVideoBuffer = fs.readFileSync("./media/logo.mp4"); // Replace with your video file path
  const exitVoiceBuffer = fs.readFileSync("./media/exit.mp3"); // Replace with your voice file path

  // Send video logo with exit message
  await sock.sendMessage(senderJid, {
    video: exitVideoBuffer,
    caption: `👋 Terima kasih telah menggunakan layanan *${BOT_NAME}*! Jika butuh bantuan lagi, cukup ketik */start* untuk memulai kembali.`,
  });

  // Send exit voice
  await sock.sendMessage(senderJid, {
    audio: exitVoiceBuffer,
    mimetype: "audio/mp4", // or use "audio/mpeg" based on your file type
  });
  break;
           
  case "/addproduk":
    if (senderJid === OWNER_JID) {
      // Perintah hanya untuk admin
      const produkData = text.slice(11).split(","); // Format perintah: /addproduk Nama Produk, Harga
      if (produkData.length === 2) {
        const namaProduk = produkData[0].trim();
        const harga = parseFloat(produkData[1].trim());

        if (!namaProduk || isNaN(harga)) {
          await reply("⚠️ Format salah. Gunakan: /addproduk Nama Produk, Harga");
        } else {
          const produkBaru = addProduk(namaProduk, harga);
          await reply(`✅ Produk baru berhasil ditambahkan:\n\nID: ${produkBaru.id}\nNama: ${produkBaru.nama}\nHarga: Rp ${produkBaru.harga}`);
        }
      } else {
        await reply("⚠️ Format salah. Gunakan: /addproduk Nama Produk, Harga");
      }
    } else {
      await reply("❌ Perintah ini hanya dapat digunakan oleh admin.");
    }
    break;
      default:
        await delay(800);
        reply("⚠️ Perintah tidak dikenali. Gunakan */menu* untuk melihat opsi yang tersedia.");
        break;
    }
  });
}

connectBot();
