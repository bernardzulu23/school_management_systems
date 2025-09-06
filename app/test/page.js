export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-8">
          Test Page - School Management System
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          If you can see this page, Next.js is working correctly!
        </p>
        <div className="space-y-4">
          <a 
            href="/dashboard/student" 
            className="block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Student Dashboard
          </a>
          <a 
            href="/dashboard/teacher" 
            className="block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Teacher Dashboard
          </a>
          <a 
            href="/dashboard/hod" 
            className="block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            HOD Dashboard
          </a>
          <a 
            href="/dashboard/headteacher" 
            className="block bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Headteacher Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
