import "./globals.css";

export const metadata = {
  title: "Real Estate Assistant",
  description: "Find your dream property with our AI expert.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
