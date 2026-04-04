import dns from "dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");
console.log("🔍 Configuração de DNS aplicada: IPv4 preferencial");
console.log("Conectando ao MongoDB...");

export async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
    console.log("✅ MongoDB conectado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao conectar no MongoDB:", error);
    process.exit(1);
  }
}
