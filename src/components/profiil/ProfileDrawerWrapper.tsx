"use client";

import { ProfileDrawer } from "./ProfileDrawer";
import { useProfileDrawer } from "@/lib/profile-drawer-context";

export function ProfileDrawerWrapper() {
  const { isOpen, close } = useProfileDrawer();
  return <ProfileDrawer open={isOpen} onClose={close} />;
}
