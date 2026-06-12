import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// My Queries is disabled — redirect to Reply to Queries.
const QueriesPage: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/queries/assign');
  }, [router]);
  return null;
};

export default QueriesPage;

/* COMMENTED OUT — original My Queries page (Task 3)

import React, { useEffect, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../_app';
import QueryTabs from '../../components/QueryTabs';

... full implementation preserved in git history / prior revision ...

const QueriesPageLegacy: React.FC = () => { ... };

*/
