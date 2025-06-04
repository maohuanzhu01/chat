import { jwtDecode } from 'jwt-decode';
import Api from './interceptor';

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
        // Chiamata al backend per ottenere i token
        const response = await Api.post(
            'http://127.0.0.1:8080/api/token/',
            { username, password },
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('🔹 Risposta completa:', response.data);
        console.log('🔹 Access Token ricevuto:', response.data.access);
        console.log('🔹 Refresh Token ricevuto:', response.data.refresh);
        console.log('🔹 Nome ricevuto:', response.data.first_name);
        console.log('🔹 Cognome ricevuto:', response.data.last_name);
        console.log('🔹 User ricevuto:', response.data.user);

        // Ottieni i token dalla risposta
        const accessToken = response.data.access;
        const refreshToken = response.data.refresh;
        const nome = response.data.first_name;
        const cognome = response.data.last_name;
        const user = response.data.user;

        if (!accessToken || !refreshToken) {
            throw new Error("❌ Access token o Refresh token mancante!");
        }

        // Decodifica il token JWT (opzionale, per il debug)
        const decodedToken = jwtDecode(accessToken);
        console.log('🔹 Decoded Token:', decodedToken);

        // Memorizza l'access token nel sessionStorage con scadenza di 15 minuti
        sessionStorage.setItem('auth_token', accessToken);
        sessionStorage.setItem('nome', nome);
        sessionStorage.setItem('cognome', cognome);
        sessionStorage.setItem('user', user);
        sessionStorage.setItem('auth_token_expiry', (Date.now() + 15 * 60 * 1000).toString()); // Scadenza di 15 minuti

        // Memorizza anche il refresh token nel sessionStorage
        sessionStorage.setItem('refresh_token_chat', refreshToken);

        console.log('🔹 Token access_token_chat salvato nel sessionStorage');
        console.log('🔹 Token refresh_token_chat salvato nel sessionStorage');

        return JSON.stringify(response.data);
    } catch (error: any) {
        console.error('❌ Errore nel salvataggio del token:', error);
        return JSON.stringify({ error: error.response?.data?.detail || error.message });
    }
};

/**
 * Funzione per rinnovare il token di accesso quando scade.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = sessionStorage.getItem('refresh_token_chat');

    if (!refreshToken) {
        console.error("❌ Nessun refresh token trovato!");
        return null;
    }

    try {
        const response = await Api.post(
            'http://127.0.0.1:8080/api/token/refresh/',
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = response.data.access;
        if (!newAccessToken) throw new Error("❌ Il nuovo access token non è stato ricevuto!");

        // Salva il nuovo access token nel sessionStorage con scadenza di 15 minuti
        sessionStorage.setItem('auth_token', newAccessToken);
        sessionStorage.setItem('auth_token_expiry', (Date.now() + 15 * 60 * 1000).toString()); // Scadenza di 15 minuti

        console.log("✅ Access token aggiornato nel sessionStorage!");
        return newAccessToken;
    } catch (error: any) {
        console.error('❌ Errore nel rinnovare il token:', error);
        return null;
    }
};

/**
 * Funzione per effettuare richieste protette con gestione automatica del token.
 */
export const getDataEconomics = async (startDate: string, endDate: string, reportType: string): Promise<string> => {
    let token = sessionStorage.getItem('auth_token');
    const tokenExpiry = sessionStorage.getItem('auth_token_expiry');

    // Funzione per formattare la data nel formato YYYY-MM-DD
    const formatDate = (date: string) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0]; // Restituisce la data nel formato YYYY-MM-DD
    };

    // Assicurati che le date siano nel formato corretto
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // Debug: stampa le date formattate
    console.log('Start Date Formattata:', formattedStartDate);
    console.log('End Date Formattata:', formattedEndDate);

    // Se il token è scaduto, prova a rinnovarlo
    if (!token || (tokenExpiry && Date.now() > parseInt(tokenExpiry))) {
        console.warn("⚠️ Access token assente o scaduto, tentativo di refresh...");
        const newToken = await refreshAccessToken();
        if (!newToken) {
            console.error("❌ Impossibile rinnovare il token, accesso negato!");
            return JSON.stringify({ error: 'Sessione scaduta, effettuare nuovamente il login.' });
        }
        token = newToken;
    }

    try {
        const response = await Api.get('http://localhost:8000/excel-report/', {
            params: {
                report_type: reportType,
                start_date: formattedStartDate,
                end_date: formattedEndDate
            },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Risultato:', response.data);
        return JSON.stringify(response.data);
    } catch (error: any) {
        console.error('❌ Errore nella richiesta protetta:', error);
        return JSON.stringify({ error: error.response?.data || error.message });
    }
};


// Test API diretta
export const getDataWithTimestamp = () => {
    return fetch(`https://jsonplaceholder.typicode.com/todos/3?timestamp=${new Date().getTime()}`, {
        cache: "no-store",
        headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            "Expires": "0",
        },
    })
    .then(response => response.json());
};
