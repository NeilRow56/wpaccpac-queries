export type CreateOrganizationResult =
  | { success: true; organizationId: string }
  | { success: false; error: string }
