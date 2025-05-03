module.exports = async (lenwy, m) => {
  const msg = m.messages[0];
  if (!msg.message) return;

  const body =
    msg.message.conversation || msg.message.extendedTextMessage?.text || "";
  const sender = msg.key.remoteJid;
  const pushname = msg.pushName || "Lenwy";

  // Prefix Bot Lenwy
  if (!body.startsWith("!")) return;

  // Eksekusi Perintah Setelah Prefix
  const args = body.slice(1).trim().split(" ");
  const command = args.shift().toLowerCase();
};
