import axios from "axios";

//função que converte endereço em coordenadas
export async function geoCoordinatesFromAddress(address: string) {
	const apiKey = process.env.GEOAPIFY_API_KEY;

	if (!apiKey) {
		throw new Error("Chave de API não configurada");
	}

	try {
		const response = await axios.get(
			"https://api.geoapify.com/v1/geocode/search",
			{
				params: {
					text: address, //endereço a ser consultado
					apiKey: apiKey, //chave da API
					filter: "countrycode:br", // Restringe a busca apenas ao Brasil
					lang: "pt", //retorna em portugues
					limit: 1, //só precisamos do melhor resultado
				},
			},
		);

		const results = response.data.features;

		if (!results || results.length === 0) {
			//se não houver resultados
			throw new Error("Endereço não encontrado pelo Geoapify");
		}

		const { properties, geometry } = results[0];
		const [lng, lat] = geometry.coordinates; // GeoJSON: [longitude, latitude]
		const state = properties.state || "São Paulo";
		const city = properties.city || properties.county || "São Paulo";

		return {
			latitude: lat,
			longitude: lng,
			state: state,
			city: city,
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

//função que converte coordenadas em endereço
export async function getCityFromCoordinates(lat: number, lng: number) {
	const apiKey = process.env.GEOAPIFY_API_KEY;
	try {
		const response = await axios.get(
			"https://api.geoapify.com/v1/geocode/reverse",
			{
				params: {
					lat: lat,
					lon: lng,
					apiKey: apiKey,
					lang: "pt",
				},
			},
		);

		const results = response.data.features;
		if (results && results.length > 0) {
			//geoapify retorna o nome da cidade em properties.city
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