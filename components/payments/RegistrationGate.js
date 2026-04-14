'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlanComparisonCard } from '@/components/FeatureGate'
import ProviderLogos from '@/components/payments/ProviderLogos'
import PaymentForm from '@/components/payments/PaymentForm'
import { CheckCircle, XCircle, Mail, CreditCard, School, Loader2, AlertCircle } from 'lucide-react'

export function isRegistrationUnlocked(school) {
  if (!school) return false
  const isVerified = Boolean(school.emailVerified || school.isVerified)
  const isPaid = school.plan && school.plan !== 'unpaid' && school.plan !== 'trial'
  return isVerified && isPaid
}

export function getRegistrationStage(school) {
  if (!school) return 'no_school'

  const isVerified = Boolean(school.emailVerified || school.isVerified)
  const isPaid = school.plan && school.plan !== 'unpaid' && school.plan !== 'trial'

  if (!isVerified) return 'email_verification'
  if (!isPaid) return 'payment'
  return 'complete'
}

export function RegistrationGate({ school, children }) {
  const stage = getRegistrationStage(school)

  if (stage === 'complete') {
    return children
  }

  return <RegistrationUnlocker school={school} stage={stage} />
}

export default function RegistrationUnlocker({ school, stage }) {
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  if (stage === 'email_verification') {
    return (
      <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Email Verification Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-royalPurple-text2">
            Please verify your email address to continue setting up your school portal.
          </p>
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-500">
              Check your inbox at <strong>{school?.email || 'your email'}</strong> for a
              verification link. Click the link to activate your account.
            </div>
          </div>
          <div className="text-xs text-royalPurple-text3">
            Didn&apos;t receive an email? Check your spam folder or contact support.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (stage === 'payment') {
    if (paymentSuccess) {
      return (
        <Card className="bg-emerald-500/10 border-emerald-500/40">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-emerald-500 mb-2">Payment Successful!</h3>
            <p className="text-royalPurple-text2 mb-4">
              Your school portal has been activated. Refresh the page to continue setup.
            </p>
            <Button onClick={() => window.location.reload()}>Continue to School Setup</Button>
          </CardContent>
        </Card>
      )
    }

    if (showPayment) {
      return (
        <div className="space-y-6">
          <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Activate Your School Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-royalPurple-text2">
                Complete your payment to unlock your school portal. Choose a plan that fits your
                needs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PlanComparisonCard plan="basic" schoolLevel={school?.level || 'combined'} />
                <PlanComparisonCard plan="standard" schoolLevel={school?.level || 'combined'} />
                <PlanComparisonCard plan="premium" schoolLevel={school?.level || 'combined'} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Complete Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentForm
                schoolId={school?.id}
                paymentType="activation"
                defaultAmount={300}
                onSuccess={(result) => {
                  setPaymentSuccess(true)
                }}
              />
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <School className="w-5 h-5 text-emerald-500" />
              Your Email is Verified!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-royalPurple-text2">{school?.email || 'your email'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Final Step: Activate Your School Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-royalPurple-text2">
              To complete your registration and create your school portal, please select a plan and
              make your activation payment.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-4">
              <h4 className="font-semibold text-amber-500 mb-2">What you&apos;ll get:</h4>
              <ul className="space-y-2 text-sm text-royalPurple-text2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Your own school portal with your chosen name
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Access for all your teachers and staff
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Student management and gradebook
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  AI-powered teaching tools
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PlanComparisonCard plan="basic" schoolLevel={school?.level || 'combined'} />
              <PlanComparisonCard plan="standard" schoolLevel={school?.level || 'combined'} />
              <PlanComparisonCard plan="premium" schoolLevel={school?.level || 'combined'} />
            </div>

            <Button onClick={() => setShowPayment(true)} className="w-full" size="lg">
              <CreditCard className="w-4 h-4 mr-2" />
              Choose Plan & Pay
            </Button>

            <div className="flex items-center justify-center gap-4 pt-4">
              <span className="text-sm text-royalPurple-text3">Secure payment via</span>
              <ProviderLogos size={28} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export function RegistrationProgress({ school }) {
  const stage = getRegistrationStage(school)
  const stages = [
    { id: 'email_verification', label: 'Email Verification', icon: Mail },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'complete', label: 'School Setup', icon: School },
  ]

  const currentIndex = stages.findIndex((s) => s.id === stage)

  return (
    <div className="flex items-center justify-between gap-2 p-4 bg-royalPurple-muted/40 border border-royalPurple-border/40 rounded-xl">
      {stages.map((s, i) => {
        const Icon = s.icon
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        const isPending = i > currentIndex

        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                isComplete
                  ? 'bg-emerald-500 text-white'
                  : isCurrent
                    ? 'bg-amber-500 text-white'
                    : 'bg-royalPurple-border text-royalPurple-text3'
              }`}
            >
              {isComplete ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <span
              className={`text-sm hidden sm:block ${
                isPending ? 'text-royalPurple-text3' : 'text-royalPurple-text1 font-medium'
              }`}
            >
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 ${
                  isComplete ? 'bg-emerald-500' : 'bg-royalPurple-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
