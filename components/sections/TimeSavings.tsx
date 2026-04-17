'use client'

import React from 'react'

const items = [
  { task: 'Lesson planning', hours: 15, description: '~2 hours per plan × 8 plans/month' },
  { task: 'Creating stories & materials', hours: 2, description: 'Reading lesson prep' },
  { task: 'Quiz & assessment creation', hours: 4, description: '~30 min × 2 assessments/week' },
  { task: 'Writing student comments', hours: 8, description: 'End of term feedback' },
]

export function TimeSavings() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Teachers save 14+ hours every month
          </h2>
          <p className="text-lg text-gray-600">Time spent on admin work that AI can handle:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {items.map((item) => (
            <div key={item.task} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-5xl font-bold text-purple-600">{item.hours}</span>
                <span className="text-gray-600">hours/month</span>
              </div>

              <h4 className="font-semibold text-gray-900 mb-2">{item.task}</h4>

              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
          <div className="text-5xl font-bold text-purple-600 mb-4">29+ hours</div>

          <p className="text-lg text-gray-800 font-semibold mb-4">
            Total monthly time saved per teacher
          </p>

          <p className="text-gray-700 mb-6">For a school with 30 teachers:</p>

          <div className="text-3xl font-bold text-purple-600 mb-2">870 hours saved per month</div>

          <p className="text-gray-700">
            That&apos;s equivalent to hiring{' '}
            <span className="font-bold">10 full-time additional teachers</span>, except these
            teachers are already on your payroll.
          </p>
        </div>
      </div>
    </section>
  )
}
