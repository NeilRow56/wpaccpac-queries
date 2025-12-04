export function generateSlug(text: string): string {
  return text
    .toLowerCase() // Convert to lowercase
    .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces and hyphens
    .trim() // Trim spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .slice(0, 50) // Limit to 50 characters
}
