import axios from "axios";
import { API_BASE_URL } from "../../src/config";

// Crea un'istanza di Axios
const api = axios.create({
    baseURL: `${API_BASE_URL}`, // Backend Django
    withCredentials: true, // Permette l'invio automatico dei cookie
});

// Funzione per aggiornare il token
const refreshToken = async () => {
    try {
        // Effettua la richiesta di refresh token
        const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {}, { withCredentials: true });
        const newToken = response.data.access; // Assicurati che il campo "access" sia presente


        console.log("✅ Token aggiornato con successo!");
        return true;
    } catch (error) {
        console.error("❌ Errore nel refresh token", error);
        return false;
    }
};

// Interceptor per intercettare le risposte
api.interceptors.response.use(
    (response) => response, // Se la risposta è OK, la restituisce
    async (error) => {
        const originalRequest = error.config;

        // Log dell'errore prima di processare
        console.error("Errore intercettato:", error);

        // Se la richiesta fallisce con errore 401 (token scaduto) e non è stata già riprovata
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Evita loop infiniti

            const refreshed = await refreshToken();
            if (refreshed) {
                // Riprova la richiesta originale dopo il refresh
                return api(originalRequest);
            } else {
                console.error("❌ Impossibile rinnovare il token, richiesta negata.");
                return Promise.reject(error);
            }
        }

        // Per errore 500, log di dettagli aggiuntivi
        if (error.response?.status === 500) {
            console.error("Errore interno del server:", error.response?.data);
        }

        return Promise.reject(error);
    }
);

export default api;
