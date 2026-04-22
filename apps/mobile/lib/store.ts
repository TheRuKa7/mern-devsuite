import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  apiBaseUrl: string;
  accessToken: string | null;
  currentWorkspaceId: string | null;
  setApiBaseUrl: (u: string) => void;
  setAccessToken: (t: string | null) => void;
  setCurrentWorkspace: (id: string | null) => void;
  signOut: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      apiBaseUrl: "http://10.0.2.2:3000",
      accessToken: null,
      currentWorkspaceId: null,
      setApiBaseUrl: (u) => set({ apiBaseUrl: u }),
      setAccessToken: (t) => set({ accessToken: t }),
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      signOut: () => set({ accessToken: null, currentWorkspaceId: null }),
    }),
    { name: "devsuite-auth", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
