import { create } from 'zustand';
import { Project, Repository } from '@devlens/types';
import { FileTreeNode } from '../services/projectService';

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
}

interface WorkspaceState {
  projects: Array<Project & { repositories: Repository[] }>;
  activeProject: (Project & { repositories: Repository[] }) | null;
  activeRepo: Repository | null;
  fileTree: FileTreeNode[];
  openTabs: OpenTab[];
  activeTabId: string | null;
  activeLineHighlight: { start: number; end: number } | null;
  isDiffMode: boolean;
  diffOriginal: string;
  diffModified: string;
  isChatOpen: boolean;

  isSearchModalOpen: boolean;
  isDebuggerOpen: boolean;
  isExplainerOpen: boolean;

  setProjects: (projects: Array<Project & { repositories: Repository[] }>) => void;
  setActiveProject: (project: (Project & { repositories: Repository[] }) | null) => void;
  setActiveRepo: (repo: Repository | null) => void;
  setFileTree: (tree: FileTreeNode[]) => void;
  openFile: (file: { id: string; name: string; path: string; language: string; content: string }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  highlightLines: (start: number, end: number) => void;
  clearHighlight: () => void;
  openDiff: (original: string, modified: string) => void;
  closeDiff: () => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setSearchModalOpen: (open: boolean) => void;
  setDebuggerOpen: (open: boolean) => void;
  setExplainerOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  projects: [],
  activeProject: null,
  activeRepo: null,
  fileTree: [],
  openTabs: [],
  activeTabId: null,
  activeLineHighlight: null,
  isDiffMode: false,
  diffOriginal: '',
  diffModified: '',
  isChatOpen: true,
  isSearchModalOpen: false,
  isDebuggerOpen: false,
  isExplainerOpen: false,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (project) => set({ activeProject: project }),
  setActiveRepo: (repo) => set({ activeRepo: repo }),
  setFileTree: (fileTree) => set({ fileTree }),

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
  setSearchModalOpen: (open) => set({ isSearchModalOpen: open }),
  setDebuggerOpen: (open) => set({ isDebuggerOpen: open }),
  setExplainerOpen: (open) => set({ isExplainerOpen: open }),
}));
