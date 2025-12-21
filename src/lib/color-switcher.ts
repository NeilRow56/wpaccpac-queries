export function roleBadgeClass(role: 'owner' | 'admin' | 'member') {
  switch (role) {
    case 'owner':
      return 'bg-yellow-500 text-black hover:bg-yellow-500'
    case 'admin':
      return 'bg-green-600 text-white hover:bg-green-600'
    case 'member':
    default:
      return 'bg-blue-600 text-white hover:bg-blue-600'
  }
}
