import { create } from 'zustand';

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
}

interface WorkspaceState {
  activeProjectId: string | null;
  activeRepoId: string | null;
  openTabs: OpenTab[];
  activeTabId: string | null;
  activeLineHighlight: { start: number; end: number } | null;
  isDiffMode: boolean;
  diffOriginal: string;
  diffModified: string;
  isChatOpen: boolean;

  setActiveProject: (projectId: string | null) => void;
  setActiveRepo: (repoId: string | null) => void;
  openFile: (file: { id: string; name: string; path: string; language: string; content: string }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  highlightLines: (start: number, end: number) => void;
  clearHighlight: () => void;
  openDiff: (original: string, modified: string) => void;
  closeDiff: () => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProjectId: null,
  activeRepoId: null,
  openTabs: [],
  activeTabId: null,
  activeLineHighlight: null,
  isDiffMode: false,
  diffOriginal: '',
  diffModified: '',
  isChatOpen: true,

  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  setActiveRepo: (repoId) => set({ activeRepoId: repoId }),

  openFile: (file) =>
    set((state) => {
      const existing = state.openTabs.find((t) => t.id === file.id);
      if (existing) {
        return { activeTabId: file.id, isDiffMode: false };
      }
      return {
        openTabs: [...state.openTabs, file],
        activeTabId: file.id,
        isDiffMode: false,
      };
    }),

  closeTab: (tabId) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t.id !== tabId);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === tabId) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }
      return { openTabs: newTabs, activeTabId: newActiveId };
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId, isDiffMode: false }),

  highlightLines: (start, end) => set({ activeLineHighlight: { start, end } }),
  clearHighlight: () => set({ activeLineHighlight: null }),

  openDiff: (original, modified) =>
    set({ isDiffMode: true, diffOriginal: original, diffModified: modified }),
  closeDiff: () => set({ isDiffMode: false }),

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),
}));
