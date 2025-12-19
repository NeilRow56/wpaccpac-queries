import VerifyChangeEmail from '@/components/emails/change-email'
import ForgotPasswordEmail from '@/components/emails/reset-password'
import VerifyEmail from '@/components/emails/verify-email'
import sendOrganizationInviteEmail from '@/components/emails/organization-invite-email'

import { db } from '@/db'
import { user as userTable, member } from '@/db/schema'
import { eq } from 'drizzle-orm'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'

import { nextCookies } from 'better-auth/next-js'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

/** ----------------- Allowed Origins ----------------- */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ''),
  process.env.BETTER_AUTH_URL?.replace(/\/$/, ''),
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean) as string[]

const normalizeOrigin = (origin: string) =>
  origin.replace(/\/$/, '').toLowerCase()

const allowedOriginsFn = (origin: string | null | undefined, req: Request) => {
  const detected =
    req.headers.get('origin') ?? req.headers.get('referer') ?? origin
  if (!detected || detected === 'null') return true
  const normalized = normalizeOrigin(detected)
  if (ALLOWED_ORIGINS.some(o => normalizeOrigin(o) === normalized)) return true
  if (normalized.includes('.vercel.app')) return true
  console.warn('[better-auth] Blocked origin:', normalized)
  return false
}

/** ----------------- Better Auth ----------------- */
export const auth = betterAuth({
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const verifyUrl = new URL(url)

      // 🔥 REMOVE the existing one
      verifyUrl.searchParams.delete('callbackURL')
      verifyUrl.searchParams.delete('callbackUrl')

      // 🔥 ADD the correct one (Better Auth uses this casing)
      verifyUrl.searchParams.set('callbackURL', '/dashboard')

      await resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: 'Verify your email',
        react: VerifyEmail({
          username: user.name,
          verifyUrl: verifyUrl.toString()
        })
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
    changeEmail: {
      enabled: true,
      async sendChangeEmailVerification({ user, newEmail, url }) {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: user.email,
          subject: 'Change your email',
          react: VerifyChangeEmail({ newEmail, verifyUrl: url })
        })
      }
    }
  },

  session: {
    expiresIn: 60 * 24 * 60 * 60, // 60 days
    refresh: { enabled: true, interval: 5 * 60 },
    cookieCache: { enabled: true, maxAge: 5 * 60 } // Removed sameSite to satisfy TS
  },

  database: drizzleAdapter(db, { provider: 'pg' }),
  trustHost: true,
  allowedOrigins: allowedOriginsFn,
  secret: process.env.BETTER_AUTH_SECRET!,
  url: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL!,
    process.env.BETTER_AUTH_URL!,
    '*.vercel.app'
  ],

  plugins: [
    organization({
      sendInvitationEmail: async (data: {
        id: string
        email: string
        inviter: { user: { id: string; name: string | null; email: string } }
        organization: { id: string; name: string }
        role?: string
      }) => {
        const inviteLink = `${process.env.BETTER_AUTH_URL}/organization/invites/${data.id}`
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: data.email,
          subject: "You've been invited",
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
    nextCookies()
  ],

  // /** ----------------- Database Hooks ----------------- */
  databaseHooks: {
    user: {
      create: {
        after: async createdUser => {
          // Fetch full user record
          const fullUser = await db.query.user.findFirst({
            where: eq(userTable.id, createdUser.id)
          })
          if (!fullUser) return

          // ✅ Set defaults safely, no transaction needed

          await db
            .update(userTable)
            .set({
              // role: fullUser.role ?? 'user',
              isSuperUser: fullUser.isSuperUser ?? false
            })
            .where(eq(userTable.id, fullUser.id))

          // NOTE: Do NOT assign first admin here
          // Organization creator is automatically assigned `owner` by Better Auth

          // in createOrganizationAction to handle multi-org logic correctly
        }
      }
    },

    session: {
      create: {
        before: async sessionRow => {
          // If already set, return
          if (sessionRow.activeOrganizationId) return { data: sessionRow }

          // Fetch user's organizations
          const memberships = await db.query.member.findMany({
            where: eq(member.userId, sessionRow.userId),
            columns: { organizationId: true }
          })

          if (memberships.length === 1) {
            // User has exactly one org — set as active
            return {
              data: {
                ...sessionRow,
                activeOrganizationId: memberships[0].organizationId
              }
            }
          }

          // Fallback: use lastActiveOrganizationId in user table
          const dbUser = await db.query.user.findFirst({
            where: eq(userTable.id, sessionRow.userId),
            columns: { lastActiveOrganizationId: true }
          })

          if (dbUser?.lastActiveOrganizationId) {
            return {
              data: {
                ...sessionRow,
                activeOrganizationId: dbUser.lastActiveOrganizationId
              }
            }
          }

          // If no org found, keep undefined (optional: redirect to org selection page)
          return { data: sessionRow }
        }
      }
    }
  }
})

export type ErrorCode = keyof typeof auth.$ERROR_CODES | 'UNKNOWN'
export type Session = typeof auth.$Infer.Session
