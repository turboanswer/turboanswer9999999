import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateLastLogin(userId: string): Promise<void>;
  setTwoFactorSecret(userId: string, secret: string): Promise<void>;
  setTwoFactorBackupCodes(userId: string, hashedCodes: string[]): Promise<void>;
  consumeBackupCode(userId: string, matcher: (hashed: string) => Promise<boolean>): Promise<boolean>;
  enableTwoFactor(userId: string): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  setPasswordResetOtp(userId: string, otp: string, expiresAt: Date): Promise<void>;
  clearPasswordResetOtp(userId: string): Promise<void>;
  markPasswordResetVerified(userId: string, expiresAt: Date): Promise<void>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  }

  async setTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await db.update(users).set({ twoFactorSecret: secret }).where(eq(users.id, userId));
  }

  async setTwoFactorBackupCodes(userId: string, hashedCodes: string[]): Promise<void> {
    await db.update(users).set({ twoFactorBackupCodes: hashedCodes }).where(eq(users.id, userId));
  }

  // Atomically match and consume a one-time backup code. The row is locked FOR
  // UPDATE inside the transaction so two concurrent logins cannot both accept the
  // same code (TOCTOU). Returns true only if a code matched and was removed.
  async consumeBackupCode(userId: string, matcher: (hashed: string) => Promise<boolean>): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      const stored = user?.twoFactorBackupCodes || [];
      for (let i = 0; i < stored.length; i++) {
        if (await matcher(stored[i])) {
          const remaining = stored.filter((_, idx) => idx !== i);
          await tx.update(users).set({ twoFactorBackupCodes: remaining }).where(eq(users.id, userId));
          return true;
        }
      }
      return false;
    });
  }

  async enableTwoFactor(userId: string): Promise<void> {
    await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, userId));
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await db.update(users).set({ twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null }).where(eq(users.id, userId));
  }

  async unbanUser(userId: string): Promise<void> {
    await db.update(users).set({
      isBanned: false,
      banReason: null,
      banExpiresAt: null,
      banDuration: null
    }).where(eq(users.id, userId));
  }

  async setPasswordResetOtp(userId: string, otp: string, expiresAt: Date): Promise<void> {
    await db.update(users).set({
      passwordResetOtp: otp,
      passwordResetOtpExpires: expiresAt,
      passwordResetVerified: false,
      passwordResetVerifiedExpires: null,
    }).where(eq(users.id, userId));
  }

  async clearPasswordResetOtp(userId: string): Promise<void> {
    await db.update(users).set({
      passwordResetOtp: null,
      passwordResetOtpExpires: null,
      passwordResetVerified: false,
      passwordResetVerifiedExpires: null,
    }).where(eq(users.id, userId));
  }

  async markPasswordResetVerified(userId: string, expiresAt: Date): Promise<void> {
    await db.update(users).set({
      passwordResetOtp: null,
      passwordResetOtpExpires: null,
      passwordResetVerified: true,
      passwordResetVerifiedExpires: expiresAt,
    }).where(eq(users.id, userId));
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({
      password: hashedPassword,
      passwordResetOtp: null,
      passwordResetOtpExpires: null,
      passwordResetVerified: false,
      passwordResetVerifiedExpires: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  }
}

export const authStorage = new AuthStorage();
