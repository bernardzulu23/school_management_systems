'use client'

import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Map, Music, Book } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function CulturalLearningPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-royalPurple-text1 mb-8">Cultural Learning</h1>
        <p className="text-royalPurple-text2">
          Explore the rich history, languages, and traditions of Zambia.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="glass" className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1 text-2xl">
                <Globe className="mr-2 text-royalPurple-pillTx" />
                Zambian History & Heritage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Victoria_Falls_Zambia_Zimbabwe_border.jpg/1200px-Victoria_Falls_Zambia_Zimbabwe_border.jpg"
                  alt="Victoria Falls"
                  className="rounded-lg object-cover h-64 w-full"
                />
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-royalPurple-text1">Discover Our Roots</h3>
                  <p className="text-royalPurple-text2">
                    From the early Bantu migrations to the independence struggle led by Kenneth
                    Kaunda, explore the events that shaped our nation.
                  </p>
                  <Button className="bg-royalPurple-pill hover:bg-royalPurple-pill text-royalPurple-text1">
                    Start History Course
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <MessageSquareIcon className="mr-2 text-royalPurple-successTx" />
                Local Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4">
                Learn basics of Bemba, Nyanja, Tonga, and Lozi.
              </p>
              <ul className="list-disc list-inside text-royalPurple-text3 mb-4 space-y-1">
                <li>Greetings and Etiquette</li>
                <li>Common Phrases</li>
                <li>Proverbs and Idioms</li>
              </ul>
              <Button className="w-full bg-royalPurple-success hover:bg-royalPurple-success text-royalPurple-text1">
                Start Language Lessons
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center text-royalPurple-text1">
                <Music className="mr-2 text-warn" />
                Music & Arts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-royalPurple-text2 mb-4">
                Traditional music, dance, and contemporary arts.
              </p>
              <ul className="list-disc list-inside text-royalPurple-text3 mb-4 space-y-1">
                <li>Traditional Instruments</li>
                <li>Ceremonial Dances</li>
                <li>Modern Zambian Music</li>
              </ul>
              <Button className="w-full bg-warn hover:bg-g-700 text-royalPurple-text1">
                Explore Arts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

function MessageSquareIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  )
}
