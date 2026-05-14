import React from 'react'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-screen'>
      {/* Navbar, Header communs à toutes tes pages publiques */}
      <main>{children}</main>
      {/* Footer commun */}
    </div>
  )
}