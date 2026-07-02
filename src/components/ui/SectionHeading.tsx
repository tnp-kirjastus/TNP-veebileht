import Link from "next/link";

export function SectionHeading({
  title, href, linkLabel,
}: {
  title: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-5 mb-[22px] max-[760px]:grid max-[760px]:items-start">
      <h2 className="font-heading text-[clamp(30px,3.5vw,48px)] leading-none">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="text-ink font-extrabold text-sm hover:text-accent transition-colors inline-flex items-center gap-[6px] whitespace-nowrap">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
