import { Metadata } from 'next'
import { SignInForm } from '@/components/auth/signin-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your ClearView Pro account',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to ClearView Pro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Professional headlight restoration CRM
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
