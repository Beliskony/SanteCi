import React from 'react'
import AppShell from '../frontend/components/layouts/AppShell'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-screen'>
      {/* Navbar, Header communs à toutes tes pages publiques */}
      <AppShell>{children}</AppShell>
      {/* Footer commun */}
    </div>
  )
}