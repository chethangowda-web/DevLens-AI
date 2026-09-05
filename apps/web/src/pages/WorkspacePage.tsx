import React, { useEffect } from 'react';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { SearchModal } from '../components/workspace/SearchModal';
import { useWorkspaceStore } from '../stores/workspaceStore';

export const WorkspacePage: React.FC = () => {
  const { openTabs, openFile } = useWorkspaceStore();

  useEffect(() => {
    // Open default sample file if no tabs are open
    if (openTabs.length === 0) {
      openFile({
        id: 'src/auth/jwt.service.ts',
        name: 'jwt.service.ts',
        path: 'src/auth/jwt.service.ts',
        language: 'typescript',
        content: `// ==============================================================================
// Sample Indexed Source File: src/auth/jwt.service.ts
// ==============================================================================

import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class JwtService {
  private static readonly SECRET = process.env.JWT_SECRET || 'default_secret';

  /**
   * Generates a signed JWT session token
   */
  static signToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.SECRET, { expiresIn: '7d' });
  }

  /**
   * Validates and verifies JWT token signature
   */
  static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.SECRET) as TokenPayload;
  }
}
`,
      });
    }
  }, [openTabs.length, openFile]);

  return (
    <>
      <WorkspaceLayout />
      <SearchModal />
    </>
  );
};
