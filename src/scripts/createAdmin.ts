import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URL as string);

        const adminExists = await User.findOne({
            email: "admin@observacidade.com"
        })
        if (adminExists) {
            console.log("Admin já existe");
            process.exit();
        }
        const hashedPassword = await bcrypt.hash("Admin@123", 10);
        await User.create({
            fullName: "Administrador",
            rg: "000000000",
            cpf: "00000000000",
            birthDate: new Date("1990-01-01"),
            email: "admin@observacidade.com",
            password: hashedPassword,
            documentStatus: "APROVADO",
            role: "ADMIN",
        })
        console.log("Admin criado com sucesso");
        process.exit();
    } catch (error) {
        console.log("Erro ao criar admin", error);
        process.exit(1);
    }
}

createAdmin();
