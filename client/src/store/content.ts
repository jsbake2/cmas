import { create } from "zustand";
import type { Content } from "@/content/schema";
import { Content as ContentSchema, indexContent } from "@/content/schema";
import { api } from "@/api/client";

interface ContentState {
  content: Content | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  passagesById: Map<string, Content["passages"][number]>;
  itemsById: Map<string, Content["items"][number]>;
  formsById: Map<string, Content["forms"][number]>;
  load: () => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  content: null,
  status: "idle",
  error: null,
  passagesById: new Map(),
  itemsById: new Map(),
  formsById: new Map(),
  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const raw = await api.content();
      const parsed = ContentSchema.parse(raw);
      const idx = indexContent(parsed);
      set({
        content: parsed,
        status: "ready",
        ...idx,
      });
    } catch (e) {
      console.error("[content] load failed", e);
      set({
        status: "error",
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  },
}));
