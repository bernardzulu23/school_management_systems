'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import { Users, GraduationCap, BarChart3, Activity, Globe } from 'lucide-react'
import Image from 'next/image'

export default function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const { school, isLoading: isSchoolLoading } = useSchool()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      switch (user.role) {
        case 'headteacher':
          router.push('/dashboard/headteacher')
          break
        case 'hod':
          router.push('/dashboard/hod')
          break
        case 'teacher':
          router.push('/dashboard/teacher')
          break
        case 'student':
          router.push('/dashboard/student')
          break
        default:
          router.push('/login')
      }
    }
  }, [isHydrated, isAuthenticated, user, router])

  if (!isHydrated || isSchoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-deep">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royalPurple-border2"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-deep">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royalPurple-border2"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Hero & Features Section with Background Image */}
      <div className="relative w-full">
        {/* Optimized Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2187&auto=format&fit=crop"
            alt="School Management Background"
            fill
            priority
            className="object-cover"
            sizes="100vw"
            quality={85}
          />
          <div className="absolute inset-0 bg-royalPurple-deep/60" />
        </div>

        {/* Navbar */}
        <header className="relative z-10 w-full pt-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {school && school.logo_url ? (
                <img
                  src={school.logo_url}
                  alt={school.name}
                  className="h-10 w-auto object-contain bg-royalPurple-card/10 rounded-lg"
                />
              ) : (
                <GraduationCap className="h-8 w-8 text-royalPurple-text1" />
              )}
              <h1 className="text-2xl font-bold text-royalPurple-text1 tracking-tight">
                {school ? school.name : 'SchoolSys'}
              </h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2 rounded-full border border-white/30 text-royalPurple-text1 font-medium hover:bg-royalPurple-card/10 transition-all backdrop-blur-sm"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/register')}
                className="px-5 py-2 rounded-full bg-royalPurple-accent text-royalPurple-text1 font-medium hover:bg-royalPurple-accent transition-all shadow-lg shadow-blue-600/30"
              >
                Get Started
              </button>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 pt-20 pb-16 sm:pt-32 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {school ? (
            <h2 className="text-4xl md:text-6xl font-extrabold text-royalPurple-text1 tracking-tight mb-6 drop-shadow-lg leading-tight">
              Welcome to <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
                {school.name}
              </span>
            </h2>
          ) : (
            <h2 className="text-5xl md:text-7xl font-extrabold text-royalPurple-text1 tracking-tight mb-6 drop-shadow-lg">
              School Management <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
                System
              </span>
            </h2>
          )}
          <p className="mt-4 max-w-2xl mx-auto text-xl text-royalPurple-text2 font-light leading-relaxed drop-shadow-md">
            Monitor, manage, and optimize your educational institution with powerful analytics and
            real-time insights.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <button
              onClick={() => router.push('/register')}
              className="px-8 py-3 bg-royalPurple-card text-royalPurple-accentTx rounded-full font-bold text-lg hover:bg-royalPurple-card2 transition-all shadow-xl transform hover:scale-105"
            >
              Get Started &rarr;
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-3 bg-transparent border-2 border-white text-royalPurple-text1 rounded-full font-bold text-lg hover:bg-royalPurple-card/10 transition-all shadow-lg"
            >
              Log In
            </button>
          </div>
        </div>

        {/* Features Grid (Glassmorphism) */}
        <div className="relative z-10 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-royalPurple-text1 drop-shadow-md">
              Powerful Features
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-2xl bg-royalPurple-deep/40 backdrop-blur-md border border-white/10 p-8 hover:bg-royalPurple-deep/50 transition-all duration-300 shadow-2xl">
              <div className="h-12 w-12 rounded-xl bg-royalPurple-accent flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6 text-royalPurple-text1" />
              </div>
              <h3 className="text-xl font-bold text-royalPurple-text1 mb-3">
                Comprehensive Analytics
              </h3>
              <p className="text-royalPurple-text3 text-sm leading-relaxed">
                Detailed performance analytics and insights for students and teachers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-2xl bg-royalPurple-deep/40 backdrop-blur-md border border-white/10 p-8 hover:bg-royalPurple-deep/50 transition-all duration-300 shadow-2xl">
              <div className="h-12 w-12 rounded-xl bg-royalPurple-accent flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6 text-royalPurple-text1" />
              </div>
              <h3 className="text-xl font-bold text-royalPurple-text1 mb-3">Academic Management</h3>
              <p className="text-royalPurple-text3 text-sm leading-relaxed">
                Manage classes, subjects, and assessments efficiently.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-2xl bg-royalPurple-deep/40 backdrop-blur-md border border-white/10 p-8 hover:bg-royalPurple-deep/50 transition-all duration-300 shadow-2xl">
              <div className="h-12 w-12 rounded-xl bg-royalPurple-accent flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6 text-royalPurple-text1" />
              </div>
              <h3 className="text-xl font-bold text-royalPurple-text1 mb-3">
                Creative Teaching & STEM
              </h3>
              <p className="text-royalPurple-text3 text-sm leading-relaxed">
                Creative teaching tools and STEM learning features for modern education.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative overflow-hidden rounded-2xl bg-royalPurple-deep/40 backdrop-blur-md border border-white/10 p-8 hover:bg-royalPurple-deep/50 transition-all duration-300 shadow-2xl">
              <div className="h-12 w-12 rounded-xl bg-royalPurple-accent flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                <Globe className="h-6 w-6 text-royalPurple-text1" />
              </div>
              <h3 className="text-xl font-bold text-royalPurple-text1 mb-3">Strategic Planning</h3>
              <p className="text-royalPurple-text3 text-sm leading-relaxed">
                Set goals and manage strategic initiatives for institutional growth.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section (Blue Background) */}
      <div className="bg-royalPurple-accent w-full py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-royalPurple-card rounded-3xl p-12 text-center shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
          <h2 className="text-3xl md:text-4xl font-bold text-royalPurple-text1 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-royalPurple-text2 mb-8 max-w-2xl mx-auto text-lg">
            Join hundreds of organizations managing their educational services efficiently.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <button
              onClick={() => router.push('/register')}
              className="px-8 py-4 bg-royalPurple-accent text-royalPurple-text1 rounded-xl font-bold hover:bg-royalPurple-accent transition-colors shadow-lg"
            >
              Sign Up Free &rarr;
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 border-2 border-royalPurple-border text-royalPurple-text2 rounded-xl font-bold hover:border-royalPurple-border2 hover:text-royalPurple-accentTx transition-colors"
            >
              Sign In
            </button>
          </div>

          <div className="pt-8 border-t border-royalPurple-border">
            <p className="text-sm text-royalPurple-text3 uppercase tracking-wide font-semibold mb-2">
              Contact Support
            </p>
            <a
              href="tel:+260977934996"
              className="text-2xl font-bold text-royalPurple-accentTx hover:text-royalPurple-accentTx transition-colors"
            >
              +260 977 934 996
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
