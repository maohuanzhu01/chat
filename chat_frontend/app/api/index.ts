import Api from './interceptor';
import useStore from '../store/useStore';
import { API_BASE_URL } from "../../src/config";

/**
 * Funzione per ottenere il token JWT tramite le credenziali utente.
 * Effettua una POST a /api/token/ e memorizza il token nel sessionStorage.
 *
 * @param username - Nome utente
 * @param password - Password
 * @returns La risposta del server (in formato JSON stringificato)
 */
export const getData = async (username: string, password: string): Promise<string> => {
    try {
        // Ottieni il CSRF token prima della richiesta
        const csrfToken = await getCsrfToken();
        if (!csrfToken) throw new Error("❌ CSRF token mancante!");

        // Effettua la richiesta di login con il CSRF token
        const response = await Api.post(
            `${API_BASE_URL}/api/token/`,
            { username, password },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken  // Invia il CSRF token nel request header
                },
                withCredentials: true  // Necessario per i cookie HttpOnly
            }
        );

        console.log('✅ Login avvenuto con successo');
        
        // Dopo aver effettuato il login con successo, chiama l'endpoint protetto
        const accessToken = response.data.access;  // Ottieni l'access token dalla risposta
        
        // Restituisci i dati ricevuti dall'endpoint protetto
        return JSON.stringify({ success: true });

    } catch (error: any) {
        console.error('❌ Errore:', error);
        return JSON.stringify({ error: error.response?.data?.detail || error.message });
    }
};


/**
 * Funzione per rinnovare il token di accesso quando scade.
 */
export const refreshAccessToken = async (): Promise<boolean> => {
    try {
        const response = await Api.post(`${API_BASE_URL}/api/token/refresh/`, { withCredentials: true });

        console.log("✅ Access token aggiornato!");
        return true;
    } catch (error: any) {
        console.error('❌ Errore nel rinnovare il token:', error);
        return false;
    }
};

export const getCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await Api.get(`${API_BASE_URL}/api/csrf/`, { withCredentials: true });
        return response.data.csrftoken;
    } catch (error) {
        console.error('❌ Errore nel recupero del CSRF token:', error);
        return null;
    }
};

export type ProtectedData = {
    message: string;
    user: string;
    first_name: string;
    last_name: string;
    groups: string[];
    department: string;
    // Altri campi, se necessari
};

export const getUserData = async (): Promise<ProtectedData | null> => {
    try {
        const response = await Api.get(`${API_BASE_URL}/api/protected/`, { withCredentials: true });

        console.log('✅ Dati protetti ricevuti:', response.data);

        // Aggiorna lo stato di Zustand con i dati protetti
        const setProtectedData = useStore.getState().setProtectedData;
        setProtectedData(response.data);

        // Ritorna i dati dell'utente come ProtectedData
        return response.data as ProtectedData;
    } catch (error: any) {
        console.error('❌ Errore nella richiesta protetta:', error);
        return null;
    }
};

