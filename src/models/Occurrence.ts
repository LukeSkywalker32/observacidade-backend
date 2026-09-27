import { Schema, model } from "mongoose";
import { createOccurrenceSchema } from "../schemas/occurrence.schema";

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
    /**
     * Campo GeoJSON para queries geoespaciais (Sprint 6).
     * Formato obrigatório: { type: "Point", coordinates: [lng, lat] }
     * O 2dsphere index usa esse campo pra queries $nearSphere / $geoWithin.
     */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

// filtros e feeds
OcurrenceSchema.index({ userId: 1, createdAt: -1 });
OcurrenceSchema.index({ createdAt: -1 });
OcurrenceSchema.index({ city: 1, state: 1, createdAt: -1 });
OcurrenceSchema.index({ type: 1, createdAt: -1 });
//queries geoespaciais (raio de X km a partir de um ponto)
//2dsphere habilita $nearSphere, $geoWithin, $geoIntersects
OcurrenceSchema.index({ location: "2dsphere"})

export const Occurrence = model("Occurrence", OcurrenceSchema);
