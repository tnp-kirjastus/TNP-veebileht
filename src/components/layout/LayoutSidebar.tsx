import { NoticeBar } from "./NoticeBarClient";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Shell } from "./Shell";

export function LayoutSidebar({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <NoticeBar />
      <Header />
      <main id="main-content">
        <Shell>
          <div className="grid grid-cols-[260px_1fr] gap-[38px] pt-8 pb-10 max-[880px]:grid-cols-1">
            <aside className="self-start sticky top-[116px] max-[880px]:relative max-[880px]:top-0">{sidebar}</aside>
            <section>{children}</section>
          </div>
        </Shell>
      </main>
      <Footer />
    </>
  );
}
