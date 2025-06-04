"use client";
import React, { useState } from "react";
import { getData } from "../../api/index";
import LoginLayout from "../../../components/Layouts/LoginLayout";

export default function SignIn() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false); // Stato per mostrare/nascondere la password

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Resetta eventuali errori precedenti

        try {
            const data = await getData(username, password); // Funzione per il login
            const parsedData = JSON.parse(data);
            console.log(parsedData);
            if (parsedData.success) {
                window.location.href = "/"; // Redirige alla pagina protetta
            } else {
                setError(parsedData.error || "Nome utente o password errati.");
            }
        } catch (error) {
            setError("Errore durante la richiesta. Riprova più tardi.");
        }
    };

    return (
        <LoginLayout>
            <div className="flex justify-center mt-4">
                <div className="rounded-sm border border-stroke bg-white shadow-default max-w-md w-full p-8">
                    <div className="text-center">
                        <span className="mb-1.5 block font-medium">Benvenuto su</span>
                        <h1 className="mb-2 text-3xl font-bold text-black sm:text-title-xl2">
                            Themis
                        </h1>
                        <span className="mx-auto text-sm mb-2 block font-medium">La soluzione AI di Legalsoftech</span>
                            <img 
                                src="/img/LegalSoftech_logo_bianco.png" 
                                alt="Logo Themis" 
                                className="w-12 h-12 mx-auto mb-4"
                            />
                    </div>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-4 text-red-500">
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="mb-2.5 block font-medium text-black dark:text-white">
                                Nome utente
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Inserisci il nome utente"
                                    value={username}
                                    autoComplete="username"
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="mb-2.5 block font-medium text-black dark:text-white">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"} // Cambia il tipo dinamicamente
                                    placeholder="La stessa del pc"
                                    value={password}
                                    autoComplete="current-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)} // Toggle della password
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 focus:outline-none"
                                >
                                    {showPassword ? "🙈" : "👁️"} {/* Cambia l'icona dinamicamente */}
                                </button>
                            </div>
                        </div>

                        <div className="mb-5">
                            <input
                                type="submit"
                                value="Invia"
                                className="w-full cursor-pointer rounded-lg border border-primary bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors p-4"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </LoginLayout>
    );
}
