// app/dashboard/hod/allocation/page.js
import HODAllocationPage from '@/components/timetable/HODAllocationPage'
import ResponsiveDashboardLayout from '@/components/dashboard/ResponsiveDashboardLayout'

export const metadata = {
  title: 'Class Allocation | HOD Dashboard',
}

export default function Page() {
  return (
    <ResponsiveDashboardLayout>
      <HODAllocationPage />
    </ResponsiveDashboardLayout>
  )
}
