"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AppData, CommandType, Language } from "@/lib/types";
import { createDemoStore } from "@/lib/demo-store";
import { executeCommand, loadData } from "@/lib/supabase/gateway";
import { browserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type StoreContext = {
  data: AppData;
  demo: boolean;
  language: Language;
  t: (en: string, tl: string) => string;
  setLanguage: (lang: Language) => void;
  theme: string;
  setTheme: (theme: string) => void;
  busy: boolean;
  notice: { text: string; error: boolean } | null;
  dismiss: () => void;
  execute: (
    type: CommandType,
    payload: Record<string, unknown>,
    id?: string,
  ) => Promise<AppData>;
  reload: () => Promise<void>;
  resetDemo: () => void;
  logout: () => Promise<void>;
};
const Context = createContext<StoreContext | null>(null);
export function StoreProvider({
  children,
  initialData,
  demo,
  initialLanguage = "tl",
}: {
  children: ReactNode;
  initialData: AppData;
  demo: boolean;
  initialLanguage?: Language;
}) {
  const router = useRouter();
  const [store] = useState(() => createDemoStore(initialData, demo));
  const local = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => initialData,
  );
  const [remote, setRemote] = useState(initialData);
  const [language, setLang] = useState<Language>(initialLanguage);
  const [theme, setAppearance] = useState("light");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<StoreContext["notice"]>(
    store.error ? { text: store.error, error: true } : null,
  );
  const t = useCallback(
    (en: string, tl: string) => (language === "tl" ? tl : en),
    [language],
  );
  useEffect(() => {
    const sync = () => {
      const lang =
        localStorage.getItem("tindahub_language") === "en" ? "en" : "tl";
      const appearance =
        localStorage.getItem("tindahub_theme") === "dark" ? "dark" : "light";
      setLang(lang);
      setAppearance(appearance);
      document.documentElement.lang = lang;
      document.documentElement.dataset.theme = appearance;
    };
    queueMicrotask(sync);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const data = demo ? local : remote;
  async function execute(
    type: CommandType,
    payload: Record<string, unknown>,
    id: string = crypto.randomUUID(),
  ) {
    setBusy(true);
    try {
      const command = { id, type, payload };
      const next = demo
        ? await store.execute(command)
        : await executeCommand(data.store_id, command);
      if (!demo) setRemote(next);
      setNotice({
        text: t("Changes saved.", "Na-save na ang pagbabago."),
        error: false,
      });
      return next;
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : t("Could not save. Try again.", "Hindi ma-save. Subukan muli.");
      setNotice({ text: message, error: true });
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (!demo) {
      try {
        setRemote(await loadData(data.store_id));
      } catch (error) {
        setNotice({
          text:
            error instanceof Error
              ? error.message
              : t("Unable to refresh.", "Hindi ma-refresh."),
          error: true,
        });
      }
    }
  }
  async function logout() {
    if (!demo) {
      const { error } = await browserClient().auth.signOut();
      if (error) {
        setNotice({ text: error.message, error: true });
        return;
      }
    }
    router.replace("/login");
    router.refresh();
  }
  return (
    <Context.Provider
      value={{
        data,
        demo,
        language,
        t,
        busy,
        notice,
        execute,
        reload,
        logout,
        dismiss: () => setNotice(null),
        setLanguage(lang) {
          localStorage.setItem("tindahub_language", lang);
          document.cookie =
            "tindahub_language=" +
            lang +
            "; path=/; SameSite=Lax; max-age=31536000";
          setLang(lang);
          document.documentElement.lang = lang;
        },
        theme,
        setTheme(value) {
          localStorage.setItem("tindahub_theme", value);
          setAppearance(value);
          document.documentElement.dataset.theme = value;
        },
        resetDemo() {
          store.reset();
          setNotice({
            text: t("Demo reset.", "Na-reset ang demo."),
            error: false,
          });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("StoreProvider is missing.");
  return value;
}
