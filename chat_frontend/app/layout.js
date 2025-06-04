import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Themis AI',
  description: 'Chat AI per Studi Legali',
  icons: {
    icon: '/favicon.ico', // Percorso pubblico (deve essere nella cartella /public)
    // Oppure puoi usare altre icone (es: .png, .svg)
    // icon: '/icon.png',
    // shortcut: '/shortcut-icon.png',
    // apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={inter.className}>{children}</body>
    </html>
  )
}