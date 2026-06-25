export const metadata = {
  title: "Poké Nugget TCG",
  description: "Colecciona, organiza e intercambia tus cartas Pokémon",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "'Nunito', 'Segoe UI', sans-serif",
          background: "#0B0E13",
          color: "#DCE3E8",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
