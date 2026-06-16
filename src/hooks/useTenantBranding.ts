import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Reads the tenant's branding from the auth store and applies:
 *  - CSS custom property --color-primary (drives Tailwind pharma-* colours)
 *  - Google Font link tag for the chosen fontFamily
 *  - document.title set to appTitle
 *
 * Call this once at the top of App.tsx.
 */
export function useTenantBranding() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    const primaryColor = user?.primaryColor || '#8a0f0f'
    const fontFamily = user?.fontFamily || 'Inter'
    const appTitle = user?.appTitle || user?.tenantName || 'Scalio Pharma'

    // Update page title
    document.title = appTitle

    // Inject/update CSS variable on :root so Tailwind colour utilities pick it up
    document.documentElement.style.setProperty('--color-primary', primaryColor)

    // Load Google Font if not already loaded
    const fontId = `gfont-${fontFamily.replace(/\s+/g, '-')}`
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link')
      link.id = fontId
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`
      document.head.appendChild(link)
    }

    // Apply font to the whole page
    document.documentElement.style.setProperty('--font-family', `'${fontFamily}', sans-serif`)
    document.body.style.fontFamily = `'${fontFamily}', sans-serif`
  }, [user?.primaryColor, user?.fontFamily, user?.appTitle, user?.tenantName])
}
