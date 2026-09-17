import axios from "axios";

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
  try {
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
    return {
      latitude: lat,
      longitude: lng,
      state,
      city,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Erro Geoapify (geocode/search):",
        JSON.stringify(error.response?.data),
      );
      const detail =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.statusText ||
        error.message;
      throw new Error(`Erro na API de Geocoding: ${detail}`);
    }
    throw error;
  }
}

// Converte coordenadas em endereço (nome da cidade)
export async function getCityFromCoordinates(lat: number, lng: number) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  try {
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
  } catch (error) {
    console.error("Falha na Geolocalização:", error);
    return "Erro ao obter localização";
  }
}

/**
 * Autocomplete — devolve no formato cru do Geoapify ({ results: [...] })
 * pra o front poder usar diretamente.
 *
 * Diferente do /search, o /autocomplete:
 *  - usa format=json (não geojson)
 *  - suporta parâmetro bias=proximity:lng,lat pra priorizar perto do usuário
 *  - retorna lista de sugestões, não features
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

  try {
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

    // Devolve no formato cru — front espera { results: [...] }
    return {
      results: response.data.results ?? [],
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Erro Geoapify (geocode/autocomplete):",
        JSON.stringify(error.response?.data),
      );
      const detail =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.statusText ||
        error.message;
      throw new Error(`Erro no autocomplete: ${detail}`);
    }
    throw error;
  }
}
