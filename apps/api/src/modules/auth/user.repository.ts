import { db } from '../../db/client';
import { User, UserRole } from '@devlens/types';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  github_id: string | null;
  full_name: string;
  avatar_url: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

const mapUserRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  avatarUrl: row.avatar_url,
  role: row.role as UserRole,
  githubId: row.github_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const userRepository = {
  async findByEmail(email: string): Promise<(User & { passwordHash?: string | null }) | null> {
    const res = await db.query<UserRow>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...mapUserRow(row),
      passwordHash: row.password_hash,
    };
  },

  async findById(id: string): Promise<User | null> {
    const res = await db.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    if (!res.rows[0]) return null;
    return mapUserRow(res.rows[0]);
  },

  async findByGithubId(githubId: string): Promise<User | null> {
    const res = await db.query<UserRow>('SELECT * FROM users WHERE github_id = $1 LIMIT 1', [
      githubId,
    ]);
    if (!res.rows[0]) return null;
    return mapUserRow(res.rows[0]);
  },

  async create(data: {
    email: string;
    passwordHash?: string;
    fullName: string;
    avatarUrl?: string;
    githubId?: string;
    role?: UserRole;
  }): Promise<User> {
    const res = await db.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, avatar_url, github_id, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.email.toLowerCase(),
        data.passwordHash || null,
        data.fullName,
        data.avatarUrl || null,
        data.githubId || null,
        data.role || 'developer',
      ]
    );
    return mapUserRow(res.rows[0]);
  },

  async updateGithubInfo(
    id: string,
    githubId: string,
    avatarUrl?: string
  ): Promise<User> {
    const res = await db.query<UserRow>(
      `UPDATE users
       SET github_id = $2, avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, githubId, avatarUrl || null]
    );
    return mapUserRow(res.rows[0]);
  },
};
