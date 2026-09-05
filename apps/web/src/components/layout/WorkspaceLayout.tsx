import React from 'react';
import { AppHeader } from './AppHeader';
import { FileTreeSidebar } from './FileTreeSidebar';
import { MonacoViewer } from '../editor/MonacoViewer';
import { MonacoDiffViewer } from '../editor/MonacoDiffViewer';
import { ChatDrawerPlaceholder } from '../chat/ChatDrawerPlaceholder';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export const WorkspaceLayout: React.FC = () => {
  const { isDiffMode } = useWorkspaceStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-slate-100 overflow-hidden select-none">
      {/* Top Application Header */}
      <AppHeader />

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: File Tree Explorer */}
        <FileTreeSidebar />

        {/* Center Pane: Monaco Editor or Diff Viewer */}
        <main className="flex-1 flex overflow-hidden relative">
          {isDiffMode ? <MonacoDiffViewer /> : <MonacoViewer />}
        </main>

        {/* Right Pane: AI Assistant Chat Drawer */}
        <ChatDrawerPlaceholder />
      </div>
    </div>
  );
};
