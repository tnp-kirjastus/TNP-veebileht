import { t } from "@/lib/translations";

export function NoticeBar() {
  return (
    <div className="bg-ink text-white text-sm">
      <div className="max-w-[1320px] mx-auto px-7 max-sm:px-4">
        <div className="flex justify-between items-center min-h-[38px]">
          <span>{t.notice.free_shipping}</span>
          <span className="max-[760px]:hidden">{t.notice.tagline}</span>
        </div>
      </div>
    </div>
  );
}
