import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',

      // 👇 move "xl" collapse point to ~1400px
      xl: '1400px',

      '2xl': '1536px'
    }
  }
}

export default config
