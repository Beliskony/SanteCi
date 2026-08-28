import React from 'react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-screen'>     
      {/* Contenu principal */}
      <main>
        {children}
      </main>

    </div>
  );
}