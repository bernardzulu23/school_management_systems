'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export function GenderByGradeCard({ title, data }) {
  const rows = Array.isArray(data) ? data : []
  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-royalPurple-text1">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-8 text-royalPurple-text2">No data found.</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="grade" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#fff',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="male" stackId="g" fill="#3B82F6" name="Male" />
                <Bar dataKey="female" stackId="g" fill="#EC4899" name="Female" />
                <Bar dataKey="unknown" stackId="g" fill="#9CA3AF" name="Unknown" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
