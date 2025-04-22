// components/Layout.js
import Sidebar from './Sidebar';
import Head from 'next/head';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>医療記録システム</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      </Head>
      <Sidebar />
      <main className="ml-64 p-6">
        {children}
      </main>
    </div>
  );
}