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
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "furto",
        "roubo",
        "assalto",
        "atividade suspeita",
        "vandalismo",
        "outros",
      ],
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
    timestamps: true,
  },
);

// ============================================
// ÍNDICES — ordem importa pra performance:
// - userId: usado pra listMyOccurrences
// - createdAt desc: feed do mapa (mais novo primeiro)
// - city+state composto: filtro geográfico
// - type: filtro por tipo de crime
// ============================================
OcurrenceSchema.index({ userId: 1, createdAt: -1 });
OcurrenceSchema.index({ createdAt: -1 });
OcurrenceSchema.index({ city: 1, state: 1, createdAt: -1 });
OcurrenceSchema.index({ type: 1, createdAt: -1 });

export const Occurrence = model("Occurrence", OcurrenceSchema);
