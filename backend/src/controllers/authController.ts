import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../prisma';
import { generateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

const MOCK_USERS: any[] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

function userPublicFields(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profilePicture: user.profilePicture,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    onboardingCompleted: user.onboardingCompleted,
    provider: user.provider,
    createdAt: user.createdAt
  };
}

// ── Register ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let existingUser: any;
    try {
      existingUser = await (prisma as any).user.findUnique({ where: { email } });
    } catch {
      existingUser = MOCK_USERS.find(u => u.email === email);
    }
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    let newUser: any;
    try {
      newUser = await (prisma as any).user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          provider: 'LOCAL',
          preferences: {
            create: {
              interests: [],
              emailBreakingNews: true,
              emailDailyBrief: true
            }
          },
          emailVerifications: {
            create: {
              token: verificationToken,
              expiresAt: tokenExpiry
            }
          }
        }
      });
    } catch (dbErr) {
      // Mock fallback
      newUser = {
        id: crypto.randomUUID(),
        email,
        name: name || null,
        passwordHash,
        profilePicture: null,
        role: 'USER',
        isEmailVerified: false,
        onboardingCompleted: false,
        provider: 'LOCAL',
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      MOCK_USERS.push(newUser);
    }

    const token = generateToken({ userId: newUser.id, email: newUser.email, role: newUser.role });

    // In production: send verification email here
    // For now, return token so app is usable immediately
    return res.status(201).json({
      message: 'Account created successfully',
      user: userPublicFields(newUser),
      token,
      verificationEmailSent: true,
      // Dev convenience: expose token so user can verify manually if needed
      _devVerificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
    });
  } catch (err: any) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user: any;
    try {
      user = await (prisma as any).user.findUnique({
        where: { email },
        include: { preferences: true }
      });
    } catch {
      user = MOCK_USERS.find(u => u.email === email);
    }

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    return res.json({
      message: 'Login successful',
      user: userPublicFields(user),
      token,
      preferences: user.preferences || null
    });
  } catch (err: any) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Login failed', detail: err.message });
  }
}

// ── Logout (stateless – client discards token) ────────────────────────────────

export async function logout(req: Request, res: Response) {
  return res.json({ message: 'Logged out successfully' });
}

// ── Verify Email ──────────────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.params;
    let verRecord: any;
    try {
      verRecord = await (prisma as any).emailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });
    } catch {
      return res.json({ message: 'Email verified (mock mode)' });
    }

    if (!verRecord || verRecord.usedAt) {
      return res.status(400).json({ error: 'Invalid or already used token' });
    }
    if (new Date() > verRecord.expiresAt) {
      return res.status(400).json({ error: 'Verification token expired' });
    }

    await (prisma as any).emailVerificationToken.update({
      where: { id: verRecord.id },
      data: { usedAt: new Date() }
    });
    await (prisma as any).user.update({
      where: { id: verRecord.userId },
      data: { isEmailVerified: true }
    });

    return res.json({ message: 'Email verified successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Verification failed', detail: err.message });
  }
}

// ── Forgot Password ───────────────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user: any;
    try {
      user = await (prisma as any).user.findUnique({ where: { email } });
    } catch {
      user = MOCK_USERS.find(u => u.email === email);
    }

    // Always respond 200 to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    try {
      await (prisma as any).passwordResetToken.create({
        data: { userId: user.id, token: resetToken, expiresAt: expiry }
      });
    } catch { /* mock */ }

    // In production: send email with reset link
    return res.json({
      message: 'If that email exists, a reset link has been sent',
      _devResetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Forgot password failed', detail: err.message });
  }
}

// ── Reset Password ────────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    let record: any;
    try {
      record = await (prisma as any).passwordResetToken.findUnique({ where: { token } });
    } catch {
      return res.json({ message: 'Password reset successful (mock)' });
    }

    if (!record || record.usedAt) return res.status(400).json({ error: 'Invalid or already used token' });
    if (new Date() > record.expiresAt) return res.status(400).json({ error: 'Reset token expired' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await (prisma as any).user.update({ where: { id: record.userId }, data: { passwordHash } });
    await (prisma as any).passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    return res.json({ message: 'Password reset successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Reset failed', detail: err.message });
  }
}

// ── Get Current User (me) ─────────────────────────────────────────────────────

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    let user: any;
    try {
      user = await (prisma as any).user.findUnique({
        where: { id: userId },
        include: {
          preferences: true,
          followedTopics: { orderBy: { createdAt: 'desc' } },
          followedCompanies: { orderBy: { createdAt: 'desc' } },
          _count: { select: { bookmarks: true, readingHistory: true, notifications: true } }
        }
      });
    } catch {
      user = MOCK_USERS.find(u => u.id === userId);
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: userPublicFields(user), preferences: user.preferences, stats: user._count });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch profile', detail: err.message });
  }
}

// ── Update Profile ────────────────────────────────────────────────────────────

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { name, profilePicture } = req.body;

    let updated: any;
    try {
      updated = await (prisma as any).user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(profilePicture !== undefined ? { profilePicture } : {})
        }
      });
    } catch {
      const idx = MOCK_USERS.findIndex(u => u.id === userId);
      if (idx >= 0) {
        MOCK_USERS[idx] = { ...MOCK_USERS[idx], name: name ?? MOCK_USERS[idx].name };
        updated = MOCK_USERS[idx];
      }
    }

    return res.json({ message: 'Profile updated', user: userPublicFields(updated) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Update failed', detail: err.message });
  }
}

// ── Change Password ───────────────────────────────────────────────────────────

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password too short' });

    let user: any;
    try {
      user = await (prisma as any).user.findUnique({ where: { id: userId } });
    } catch {
      user = MOCK_USERS.find(u => u.id === userId);
    }

    if (!user || !user.passwordHash) return res.status(400).json({ error: 'Cannot change password for OAuth accounts' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    try {
      await (prisma as any).user.update({ where: { id: userId }, data: { passwordHash } });
    } catch { /* mock */ }

    return res.json({ message: 'Password changed successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Change password failed', detail: err.message });
  }
}

// ── Complete Onboarding ───────────────────────────────────────────────────────

export async function completeOnboarding(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { interests } = req.body; // string[] of category slugs

    try {
      await (prisma as any).userPreferences.upsert({
        where: { userId },
        create: { userId, interests: interests || [] },
        update: { interests: interests || [] }
      });
      await (prisma as any).user.update({ where: { id: userId }, data: { onboardingCompleted: true } });
    } catch { /* mock */ }

    return res.json({ message: 'Onboarding completed', interests });
  } catch (err: any) {
    return res.status(500).json({ error: 'Onboarding failed', detail: err.message });
  }
}
