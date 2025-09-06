import React from 'react';

export function DashboardLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">🇿🇲 Zambian School Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Student Dashboard</span>
              {title && (
                <span className="text-sm text-gray-500">| {title}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>

      {/* Simple footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 text-center text-sm text-gray-500">
            © 2025 Zambian School Management System - Empowering Rural Education
          </div>
        </div>
      </footer>
    </div>
  );
}
