import "server-only";

import { getStoreSettings } from "@/lib/settings";

export async function AccentTheme() {
  const settings = await getStoreSettings();
  const { accentColor, accentColorDark } = settings.theme;

  return (
    <style href="tnp-accent" precedence="high">{`
      :root {
        --color-accent: ${accentColor};
        --color-accent-dark: ${accentColorDark};
      }
    `}</style>
  );
}
