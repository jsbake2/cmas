import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// This password lives in the client bundle and is not real security. It's a
// "are you really mom?" speed bump so the kids can't accidentally blow away
// quiz scores by tapping the wrong button. Real authentication is enforced
// at the Cloudflare Access edge (one-time PIN to the parent's email) before
// any request even reaches the app.
const PARENT_PASSWORD = "onetwo";

interface AdminState {
  isAdmin: boolean;
  unlock: (pw: string) => boolean;
  lock: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      isAdmin: false,
      unlock: (pw) => {
        if (pw === PARENT_PASSWORD) {
          set({ isAdmin: true });
          return true;
        }
        return false;
      },
      lock: () => set({ isAdmin: false }),
    }),
    {
      name: "cmas.admin.v1",
      // sessionStorage so closing the browser tab/window locks back. The
      // parent unlocks once at the start of a review session and it stays
      // unlocked until they close the tab.
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
