import React, { useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import DeveloperQuickLogin from '../components/DeveloperQuickLogin';
import { useAuth } from './_app';

const DeveloperLoginPage: React.FC = () => {
  const router = useRouter();
  const { user, initialized } = useAuth();

  useEffect(() => {
    if (initialized && user) {
      router.replace('/dashboard');
    }
  }, [user, initialized, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <p className="mb-4 text-center text-xs text-slate-500">
          Normal login at{' '}
          <a href="/login" className="text-amber-400 hover:underline">
            /login
          </a>
        </p>
        <DeveloperQuickLogin variant="standalone" />
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

export default DeveloperLoginPage;
