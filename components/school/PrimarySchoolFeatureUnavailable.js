'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PrimarySchoolFeatureUnavailable({
  title = 'Not available for primary schools',
  children,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-royalPurple-text2 space-y-2">
        {children || (
          <>
            <p>
              This feature is for secondary schools (Grade 8–12 and Forms). Primary schools
              (ECE–Grade 7) use CBC continuous assessment instead of secondary-style term grading.
            </p>
            <p>
              HOD department management is also not used in primary schools — teachers report to the
              headteacher directly.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
