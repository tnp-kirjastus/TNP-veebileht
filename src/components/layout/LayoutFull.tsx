import { Header } from "./Header";
import { Footer } from "./Footer";

export function LayoutFull({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
