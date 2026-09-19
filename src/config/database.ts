import mongoose from "mongoose";

console.log("Conectando ao MongoDB...")

export async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
    console.log("✅ MongoDB conectado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao conectar no MongoDB:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("MongoDB desconectado (SIGINT)");
  process.exit(0);
})

process.on("SIGTERM", async () => {
  await mongoose.disconnect();
  console.log("MongoDB desconectado (SIGTERM)");
  process.exit(0);
})
