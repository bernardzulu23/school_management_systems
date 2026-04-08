import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

export default function UserTypeCards({
  userTypes,
  activeUserType,
  setActiveUserType,
  countsLoading,
}) {
  return (
    <section aria-label="User categories summary" className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {userTypes.map((type) => {
        const Icon = type.icon
        const isActive = activeUserType === type.id
        return (
          <Card
            key={type.id}
            variant="glass"
            className={`cursor-pointer transition-all duration-300 ${
              isActive
                ? 'scale-105 border-royalPurple-border2/60'
                : 'hover:scale-105 hover:border-royalPurple-border2/40'
            }`}
            onClick={() => setActiveUserType(type.id)}
            role="button"
            aria-pressed={isActive}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveUserType(type.id)}
          >
            <CardContent className="p-6 text-center">
              <div
                className={`backdrop-blur-md rounded-2xl p-4 mb-4 ${
                  isActive
                    ? 'bg-royalPurple-accent/60 border border-royalPurple-border2/50'
                    : 'bg-royalPurple-muted/60 border border-royalPurple-border/40'
                }`}
              >
                <Icon className="h-8 w-8 text-royalPurple-text1 mx-auto" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-royalPurple-text1 text-lg mb-2">{type.name}</h3>
              <p className="text-3xl font-bold text-royalPurple-accentTx">
                {countsLoading ? '...' : type.count}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
