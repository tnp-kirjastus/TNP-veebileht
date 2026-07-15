import { Header } from "./Header";
import { Footer } from "./Footer";
import { Shell } from "./Shell";

export function LayoutContained({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content">
        <Shell>{children}</Shell>
      </main>
      <Footer />
    </>
  );
}
