import { CodeFile } from '@devlens/types';
import { FileTreeNode } from '../modules/projects/project.types';

/**
 * Transforms flat CodeFile database records into a nested directory/file hierarchy
 */
export function buildFileTree(files: CodeFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.filePath.split(/[/\\]/);
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      if (isFile) {
        currentLevel.push({
          id: file.id,
          name: part,
          path: file.filePath,
          type: 'file',
          language: file.language,
          fileSizeBytes: file.fileSizeBytes,
        });
      } else {
        let dirNode = currentLevel.find(
          (node) => node.type === 'directory' && node.name === part
        );

        if (!dirNode) {
          dirNode = {
            id: `dir:${currentPath}`,
            name: part,
            path: currentPath,
            type: 'directory',
            children: [],
          };
          currentLevel.push(dirNode);
        }

        if (!dirNode.children) {
          dirNode.children = [];
        }
        currentLevel = dirNode.children;
      }
    }
  }

  // Helper to sort directories first, then files alphabetically
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });

    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
    return nodes;
  };

  return sortNodes(root);
}
