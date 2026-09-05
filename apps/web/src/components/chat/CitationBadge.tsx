import React from 'react';
import { CodeCitation } from '@devlens/types';
import { FileCode, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { projectService, FileTreeNode } from '../../services/projectService';

interface CitationBadgeProps {
  citation: CodeCitation;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({ citation }) => {
  const { fileTree, openTabs, openFile, setActiveTab, highlightLines } = useWorkspaceStore();

  const handleClick = async () => {
    // 1. Check if the file is already open in tabs
    const existingTab = openTabs.find(
      (t) => t.path === citation.filePath || t.path.endsWith(citation.filePath)
    );

    if (existingTab) {
      setActiveTab(existingTab.id);
      highlightLines(citation.startLine, citation.endLine);
      return;
    }

    // 2. Search for the file in the file tree
    const findFileNode = (nodes: FileTreeNode[]): FileTreeNode | null => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.path === citation.filePath || node.path.endsWith(citation.filePath)) {
            return node;
          }
        }
        if (node.children) {
          const found = findFileNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetNode = findFileNode(fileTree);

    if (targetNode) {
      try {
        const content = await projectService.getFileContent(targetNode.id);
        openFile({
          id: targetNode.id,
          name: targetNode.name,
          path: targetNode.path,
          language: targetNode.language || 'typescript',
          content,
        });
        highlightLines(citation.startLine, citation.endLine);
      } catch (err) {
        console.error('Failed to open cited file:', err);
      }
    } else {
      // Fallback: create temporary open tab with citation snippet
      openFile({
        id: `cited-${citation.filePath}`,
        name: citation.filePath.split('/').pop() || citation.filePath,
        path: citation.filePath,
        language: 'typescript',
        content: citation.snippet || '// Content not available',
      });
      highlightLines(citation.startLine, citation.endLine);
    }
  };

  const fileName = citation.filePath.split('/').pop() || citation.filePath;

  return (
    <button
      onClick={handleClick}
      title={`Open ${citation.filePath} (Lines ${citation.startLine}-${citation.endLine})`}
      className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-surfaceHover border border-border hover:border-primary/60 text-[11px] font-mono text-primary-light hover:text-white transition-colors cursor-pointer group"
    >
      <FileCode className="w-3 h-3 text-primary-light/70 group-hover:text-primary-light" />
      <span className="truncate max-w-[140px] font-medium">{fileName}</span>
      <span className="text-slate-400 text-[10px]">
        :{citation.startLine}-{citation.endLine}
      </span>
      {citation.symbolName && (
        <span className="text-[10px] text-accent-emerald flex items-center gap-0.5 ml-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          <span className="truncate max-w-[80px]">{citation.symbolName}</span>
        </span>
      )}
    </button>
  );
};
