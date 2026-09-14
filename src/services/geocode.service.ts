import axios from "axios";

//função que converte endereço em coordenadas
export async function geoCoordinatesFromAddress(address: string) {
	//const apiKey = process.env.GOOGLEMAPS_API_KEY;
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
					filter: "countrycode: br", // Restringe a busca apenas ao Brasil
					lang: "pt-BR", //retorna em portugues
					limit: 1, // so precisamos do melhor resultado
				},
			},
		);

		const results = response.data.results;

		if (!results || results.length === 0) {
			//se não houver resultados
			throw new Error("Endereço não encontrado pelo Geoapify");
		}

    const { properties, geometry } = results [0];
    const [lng, lat]= geometry.coordinates;
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
			throw new Error(
				`Erro na API de Geocoding: ${error.response?.statusText || error.message}`,
			);
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
					lng: lng,
					key: apiKey,
					lang: "pt-BR",
					//result_type: "locality" // Força retornar apenas a cidade
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
