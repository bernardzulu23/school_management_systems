'use client'

import React from 'react'

const items = [
  {
    task: 'SBA score entry & rubrics',
    hours: 6,
    description: 'One form per learner instead of re-copying class lists',
  },
  {
    task: 'ECZ CSV preparation',
    hours: 4,
    description: 'Export submission data instead of manual spreadsheets',
  },
  {
    task: 'Lesson planning (AI)',
    hours: 10,
    description: 'Draft plans teachers refine for their classes',
  },
  {
    task: 'Report comments (AI)',
    hours: 8,
    description: 'Premium: end-of-term feedback at scale',
  },
]

export function TimeSavings() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-[var(--color-accent)] tracking-[0.12em] uppercase mb-4">
            Time back for teaching
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Less admin on SBA and school records
          </h2>
          <p className="text-lg text-gray-600">
            Hours reclaimed when compliance work is built into the platform:
          </p>
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
          <div className="text-5xl font-bold text-purple-600 mb-4">28+ hours</div>

          <p className="text-lg text-gray-800 font-semibold mb-4">
            Typical monthly time saved per teacher
          </p>

          <p className="text-gray-700 mb-6">For a school with 30 teachers:</p>

          <div className="text-3xl font-bold text-purple-600 mb-2">840+ hours saved per month</div>

          <p className="text-gray-700">
            More time for marking quality SBA and preparing learners for ECZ examinations.
          </p>
        </div>
      </div>
    </section>
  )
}
