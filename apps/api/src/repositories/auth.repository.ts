import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
};

export const authRepository = {
  findUserByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });
  },

  findUserById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, passwordHash: true, role: true },
    });
  },

  createUser(email: string, passwordHash: string): Promise<UserRecord> {
    return prisma.user.create({
      data: { email, passwordHash, role: 'USER' },
      select: { id: true, email: true, passwordHash: true, role: true },
    });
  },

  createRefreshToken(data: Prisma.RefreshTokenCreateManyInput): Promise<void> {
    return prisma.refreshToken.create({ data }).then(() => undefined);
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  },

  async rotateRefreshToken(input: {
    tokenHash: string;
    csrfTokenHash: string;
    nextTokenHash: string;
    nextCsrfTokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.$transaction(
      async (tx) => {
        const current = await tx.refreshToken.findUnique({
          where: { tokenHash: input.tokenHash },
          include: { user: { select: { id: true, email: true, role: true } } },
        });

        if (!current) return { kind: 'invalid' as const };
        if (current.revokedAt) {
          await tx.refreshToken.updateMany({
            where: { familyId: current.familyId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          return { kind: 'reused' as const };
        }
        if (current.expiresAt <= new Date()) {
          await tx.refreshToken.update({
            where: { id: current.id },
            data: { revokedAt: new Date() },
          });
          return { kind: 'expired' as const };
        }
        if (current.csrfTokenHash !== input.csrfTokenHash) {
          return { kind: 'csrf-invalid' as const };
        }

        const revoked = await tx.refreshToken.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (revoked.count !== 1) {
          await tx.refreshToken.updateMany({
            where: { familyId: current.familyId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          return { kind: 'reused' as const };
        }

        await tx.refreshToken.create({
          data: {
            tokenHash: input.nextTokenHash,
            csrfTokenHash: input.nextCsrfTokenHash,
            familyId: current.familyId,
            userId: current.userId,
            expiresAt: input.expiresAt,
          },
        });

        return {
          kind: 'rotated' as const,
          user: current.user,
          familyId: current.familyId,
          refreshExpiresAt: input.expiresAt,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  },

  revokeRefreshToken(tokenHash: string): Promise<void> {
    return prisma.refreshToken
      .updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then(() => undefined);
  },

  async revokeRefreshFamily(tokenHash: string): Promise<void> {
    const token = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { familyId: true },
    });
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { familyId: token.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  },

  revokeAllRefreshTokens(userId: string): Promise<number> {
    return prisma.refreshToken
      .updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then((result) => result.count);
  },
};
