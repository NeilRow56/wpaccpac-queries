export async function signOut() {
  const res = await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include', // Important: send cookies
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sign-out failed: ${res.status} ${text}`)
  }

  // Optionally redirect to homepage
  window.location.href = '/auth'
}
