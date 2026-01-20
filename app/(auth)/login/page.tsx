import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-2 text-gray-600">Sign in to your account</p>
      </div>
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </>
  );
}
