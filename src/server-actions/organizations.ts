'use server'

import { eq, inArray } from 'drizzle-orm'

import { getCurrentUser } from './users'
import { db } from '@/db'
import { revalidatePath } from 'next/cache'
import { member, organization } from '@/db/schema'

export async function getOrganizations() {
  const { currentUser } = await getCurrentUser()

  const members = await db.query.member.findMany({
    where: eq(member.userId, currentUser.id)
  })

  const organizations = await db.query.organization.findMany({
    where: inArray(
      organization.id,
      members.map(m => m.organizationId)
    )
  })

  return organizations
}

export async function getActiveOrganization(userId: string) {
  const memberUser = await db.query.member.findFirst({
    where: eq(member.userId, userId)
  })

  if (!memberUser) {
    return null
  }

  const activeOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, memberUser.organizationId)
  })

  return activeOrganization
}

export async function getOrganizationBySlug(slug: string) {
  try {
    const organizationBySlug = await db.query.organization.findFirst({
      where: eq(organization.slug, slug),
      with: {
        members: {
          with: {
            user: true
          }
        }
      }
    })

    return organizationBySlug
  } catch (error) {
    console.error(error)
    return null
  }
}

export const deleteOrganization = async (id: string, path: string) => {
  try {
    await db.delete(organization).where(eq(organization.id, id))
    revalidatePath(path)
    return { success: true, message: 'Organization deleted successfully' }
  } catch {
    return { success: false, message: 'Failed to delete organization' }
  }
}

// export async function createOrganization(formData: FormData) {
//   try {

//     // get the current user

//     const session = await auth.api.getSession({
//       headers: await headers()
//     })
//     if(!session || !session?.user) {
//       return {
//         success: false,
//         message : "You must be logged in to create an organization"
//       }
//     }

//     // get form data

//     const name = formData.get("name") as string

//     // implement an extra validation check

//   // create slug from title
//     const slug = generateSlug(name)

//     // check if the slug alreay exists

//     const existingOrganization = await db.query.organization.findFirst({
//       where: eq(organization.slug, slug)
//     })

//     if(existingOrganization) {
//       return {
//         success: false,
//         message: "An organization with the same name already exists. Please try a new name"
//       }
//     }

//     const [newOrganization ] = await db.insert(organization).values({
//       name, slug
//     }).returning()
//       }

//   } catch (error) {
//     console.error(error)
//     return null
//   }
