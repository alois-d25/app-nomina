export default function AuthLayout({ children }) {
  return (
    <div data-theme="school" className="min-h-screen bg-background">
      <main>
        {children}
      </main>
    </div>
  );
}