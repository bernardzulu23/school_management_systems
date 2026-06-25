import HomePageClient from '@/components/marketing/HomePageClient'

export const metadata = {
  title: 'Zambian School Management System | Blue Peak Technologies',
  description:
    'The complete school management platform for Zambian primary and secondary schools. ECZ SBA, CBC curriculum, attendance, timetables, and AI tools — built for Zambia.',
  alternates: {
    canonical: 'https://www.bluepeacktechnologies.com',
  },
}

/** Marketing homepage — server shell for SEO; interactive UI in HomePageClient. */
export default function HomePage() {
  return <HomePageClient />
}
