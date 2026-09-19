import axios from "axios";
import { childLogger } from "../config/logger";
import { retry } from "../utils/retry";

const log = childLogger("geocode");

// Timeout explícito — sem isso request trava indefinidamente se Geoapify engasgar
const axiosInstance = axios.create({
  timeout: 5000,
});

interface AutocompleteParams {
  text: string;
  bias?: { lat: number; lng: number };
  limit?: number;
}

// Converte endereço em coordenadas (formato parseado)
export async function geoCoordinatesFromAddress(address: string) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API não configurada");
  }

  return retry(
    async () => {
      const response = await axiosInstance.get(
        "https://api.geoapify.com/v1/geocode/search",
        {
          params: {
            text: address,
            apiKey,
            filter: "countrycode:br",
            lang: "pt",
            limit: 1,
          },
        },
      );
      const results = response.data.features;
      if (!results || results.length === 0) {
        throw new Error("Endereço não encontrado pelo Geoapify");
      }
      const { properties, geometry } = results[0];
      const [lng, lat] = geometry.coordinates;
      const state = properties.state || "São Paulo";
      const city = properties.city || properties.county || "São Paulo";
      log.debug({ address, lat, lng, city, state }, "Endereço geocodificado");
      return {
        latitude: lat,
        longitude: lng,
        state,
        city,
      };
    },
    { context: "geocode.search" },
  );
}

// Converte coordenadas em endereço (nome da cidade)
export async function getCityFromCoordinates(lat: number, lng: number) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  return retry(
    async () => {
      const response = await axiosInstance.get(
        "https://api.geoapify.com/v1/geocode/reverse",
        {
          params: {
            lat,
            lon: lng,
            apiKey,
            lang: "pt",
          },
        },
      );
      const results = response.data.features;
      if (results && results.length > 0) {
        for (const result of results) {
          const city = result.properties.city || result.properties.county;
          if (city) {
            return city;
          }
        }
      }
      return "Localização desconhecida";
    },
    { context: "geocode.reverse" },
  );
}

/**
 * Autocomplete — devolve no formato cru do Geoapify ({ results: [...] })
 * pra o front poder usar diretamente.
 */
export async function autocompleteAddress({
  text,
  bias,
  limit = 5,
}: AutocompleteParams) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API não configurada");
  }

  return retry(
    async () => {
      const params: Record<string, string | number> = {
        text,
        apiKey,
        filter: "countrycode:br",
        lang: "pt",
        format: "json",
        limit,
      };

      if (bias) {
        params.bias = `proximity:${bias.lng},${bias.lat}`;
      }

      const response = await axiosInstance.get(
        "https://api.geoapify.com/v1/geocode/autocomplete",
        { params },
      );

      return {
        results: response.data.results ?? [],
      };
    },
    { context: "geocode.autocomplete" },
  );
}
