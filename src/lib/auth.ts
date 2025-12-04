import VerifyChangeEmail from '@/components/emails/change-email'
import ForgotPasswordEmail from '@/components/emails/reset-password'
import VerifyEmail from '@/components/emails/verify-email'
import sendOrganizationInviteEmail from '@/components/emails/organization-invite-email'

import { db } from '@/db'
import { member } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { admin as adminPlugin } from 'better-auth/plugins/admin'
import { nextCookies } from 'better-auth/next-js'

import { ac, roles } from '@/lib/permissions'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

/** ----------------- Helpers ----------------- */
function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin.replace(/\/$/, '').toLowerCase()
  } catch {
    return origin.replace(/\/$/, '').toLowerCase()
  }
}

function getRequestOrigin(req: Request): string | null {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  if (origin && origin !== 'null') return origin.replace(/\/$/, '')
  if (referer) {
    try {
      const url = new URL(referer)
      return url.origin.replace(/\/$/, '')
    } catch {
      return null
    }
  }
  const host = req.headers.get('host')
  return host ? `https://${host}` : null
}

/** ----------------- Allowed Origins ----------------- */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ''),
  process.env.BETTER_AUTH_URL?.replace(/\/$/, ''),
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean) as string[]

const allowedOriginsFn = (origin: string | null | undefined, req: Request) => {
  const detected = getRequestOrigin(req) || origin
  if (!detected || detected === 'null') return true

  const normalized = normalizeOrigin(detected)

  // allow exact matches
  if (ALLOWED_ORIGINS.some(o => normalizeOrigin(o) === normalized)) return true

  // allow all vercel preview domains
  if (normalized.includes('.vercel.app')) return true

  console.warn('[better-auth] Blocked origin:', normalized)
  return false
}

/** ----------------- Better-Auth ----------------- */
export const auth = betterAuth({
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: 'Verify your email',
        react: VerifyEmail({ username: user.name, verifyUrl: url })
      })
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true
  },

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: 'Reset your password',
        react: ForgotPasswordEmail({
          username: user.name,
          resetUrl: url,
          userEmail: user.email
        })
      })
    },
    requireEmailVerification: true
  },

  user: {
    deleteUser: { enabled: true },

    additionalFields: {
      role: { type: ['user', 'admin', 'owner'], input: false },
      isSuperUser: {
        type: 'boolean' as const,
        default: false as boolean
      }
    },
    changeEmail: {
      enabled: true,
      async sendChangeEmailVerification({ user, newEmail, url }) {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: user.email,
          subject: 'Reset your email',
          react: VerifyChangeEmail({ newEmail, verifyUrl: url })
        })
      }
    }
  },

  session: {
    expiresIn: 60 * 24 * 60 * 60, // 60 days
    refresh: {
      enabled: true,
      interval: 5 * 60 // 5 minutes
    },
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      sameSite: 'none', // cross-origin previews
      secure: true
    }
  },

  database: drizzleAdapter(db, { provider: 'pg' }),
  trustHost: true,
  allowedOrigins: allowedOriginsFn,
  secret: process.env.BETTER_AUTH_SECRET!,
  url: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.NEXT_PUBLIC_APP_URL!,
    process.env.BETTER_AUTH_URL!,
    '*.vercel.app'
  ],

  plugins: [
    organization({
      sendInvitationEmail: async data => {
        const inviteLink = `${process.env.BETTER_AUTH_URL}/organization/invites/${data.id}`
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: data.email,
          subject: "You've been invited to join our organization",
          react: sendOrganizationInviteEmail({
            email: data.email,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            teamName: data.organization.name,
            inviteLink
          })
        })
      }
    }),
    nextCookies(),
    adminPlugin({
      defaultRole: 'user',
      adminRoles: ['admin', 'owner'],
      ac,
      roles
    })
  ],

  databaseHooks: {
    session: {
      create: {
        before: async userSession => {
          const membership = await db.query.member.findFirst({
            where: eq(member.userId, userSession.userId),
            orderBy: desc(member.createdAt),
            columns: { organizationId: true }
          })

          return {
            data: {
              ...userSession,
              activeOrganizationId: membership?.organizationId
            }
          }
        }
      }
    }
  }
})

export type ErrorCode = keyof typeof auth.$ERROR_CODES | 'UNKNOWN'
export type Session = typeof auth.$Infer.Session
