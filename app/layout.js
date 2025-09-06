import './globals.css'
import '../styles/glassmorphism.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'School Management System',
  description: 'Complete school management solution built with Laravel and Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
