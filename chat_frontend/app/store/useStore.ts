import { create } from 'zustand';

// Definizione dell'interfaccia per i dati protetti
interface ProtectedData {
  message: string; // Messaggio dalla risposta API
  user: string; // Nome utente o ID
  first_name: string; // Nome dell'utente
  last_name: string; // Cognome dell'utente
  groups: string[]; // Array di ruoli/gruppi dell'utente
}

// Definizione dell'interfaccia per lo store
interface Store {
  user: string | null; // Nome utente o ID
  protectedData: ProtectedData | null; // Dati protetti
  setUser: (user: string | null) => void; // Funzione per impostare l'utente
  setProtectedData: (data: ProtectedData | null) => void; // Funzione per impostare i dati protetti
  clearStore: () => void; // Funzione per resettare lo store (utile per il logout)
}

// Creazione dello store Zustand
const useStore = create<Store>((set) => ({
  user: null, // Stato iniziale: utente non loggato
  protectedData: null, // Stato iniziale: nessun dato protetto

  // Funzione per impostare l'utente
  setUser: (user) => set({ user }),

  // Funzione per impostare i dati protetti
  setProtectedData: (data) => {
    console.log('🔄 Aggiornamento dello store con i dati protetti:', data);
    set({ protectedData: data });
  },
  

  // Funzione per resettare lo store (utile per il logout)
  clearStore: () => set({ user: null, protectedData: null }),
}));

export default useStore;