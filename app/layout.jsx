import "@/app/globals.css";
import { AuthProvider } from "./context/auth_context";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export const metadata = {
  title: "Mi App",
  description: "Sistema administrativo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          {children}
          <ToastContainer position="bottom-right" autoClose={3000} />
        </AuthProvider>
      </body>
    </html>
  );
}