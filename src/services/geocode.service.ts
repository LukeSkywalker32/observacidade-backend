import axios from "axios";

//função que converte endereço em coordenadas
export async function geoCoordinatesFromAddress(address: string) {
    const apiKey = process.env.GOOGLEMAPS_API_KEY;

    if (!apiKey) {
        throw new Error("Chave de API não configurada")
    }

    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: {
                address: address, //endereço a ser consultado
                key: apiKey, //chave da API
                countrycode: 'br', // Restringe a busca apenas ao Brasil
                language: "pt-br", //retorna em portugues
            }
        }
        );

        const results = response.data.results

        if (!results || results.length === 0) { //se não houver resultados
            throw new Error("Endereço não encontrado pelo Google")
        }
         
        const result = results[0];
        const { lat, lng } = result.geometry.location;
        const stateComponent = result.address_components.find((c: any) =>
            c.types.includes("administrative_area_level_1"));
        const state = stateComponent ? stateComponent.long_name : "São Paulo";

        const cityComponent = result.address_components.find((c: any) =>
            c.types.includes("administrative_area_level_2"));
        const city = cityComponent ? cityComponent.long_name : "São Paulo";

        return {
            latitude: lat,
            longitude: lng,
            state: state,
            city: city,
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Erro na API de Geocoding: ${error.response?.statusText || error.message}`)
        }
        throw error;
    }
}

//função que converte coordenadas em endereço
export async function getCityFromCoordinates(lat: number, lng: number) {
    const apiKey = process.env.GOOGLEMAPS_API_KEY;
    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
            params: {
                latlng: `${lat},${lng}`,
                key: apiKey,
                language: "pt-BR",
                //result_type: "locality" // Força retornar apenas a cidade
            }
        });

        const results = response.data.results;
        if (results && results.length > 0) {
            //google retorna o nome da cidade completo
            for (const result of results){
               const cityComponent = result.address_components.find((c: any) => 
               c.types.includes("administrative_area_level_2") ||
               c.types.includes("locality"));

               if (cityComponent) {
                return cityComponent.long_name;
               }
            }
        }
        return "Localização desconhecida"
    } catch (error) {
        return "Erro ao obter localização"
    }

}