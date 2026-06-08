import type { GetServerSideProps, NextPage } from 'next';

const IndexPage: NextPage = () => null;

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/login',
      permanent: false,
    },
  };
};

export default IndexPage;

