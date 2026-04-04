import { Schema, model } from "mongoose";

const OcurrenceSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
            //uppercase: true,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            //uppercase: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["furto", "roubo", "assalto", "atividade suspeita", "vandalismo", "outros"],
        },
        description: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 400,
        },
        latitude: {
            type: Number,
            required: true,
        },
        longitude: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true, // cria createdAt automaticamente
    }
);

export const Occurrence = model("Occurrence", OcurrenceSchema);