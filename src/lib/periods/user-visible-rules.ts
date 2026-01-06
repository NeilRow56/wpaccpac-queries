// test('cannot close a closed period', async ({ page }) => {
//     await page.goto('/fixed-assets/periods')

//     const closedRow = page.getByText('2024 Q3')
//     await expect(
//       closedRow.getByRole('button', { name: 'Close' })
//     ).toBeDisabled()
//   })

//   test('can roll forward current period', async ({ page }) => {
//     await page.goto('/fixed-assets/periods')

//     await page
//       .getByRole('button', { name: 'Roll Forward' })
//       .click()

//     await page.getByRole('button', {
//       name: 'Confirm Roll Forward'
//     }).click()

//     await expect(
//       page.getByText('2025 Q1')
//     ).toBeVisible()
//   })
