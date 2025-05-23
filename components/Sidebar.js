// components/Sidebar.js の修正
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar() {
  const router = useRouter();

  const isActive = (path) => {
    return router.pathname.startsWith(path);
  };

  const navigationItems = [
    {
      name: 'ダッシュボード',
      path: '/',
      icon: 'fas fa-home'
    },
    {
      name: 'AI診療サマリー',
      path: '/generation',
      icon: 'fas fa-robot'
    },
    {
      name: '診療録検索',
      path: '/records',
      icon: 'fas fa-search'
    },
    {
      name: '予約管理',  // 新規追加
      path: '/appointments',
      icon: 'fas fa-calendar-alt'
    },
    {
      name: '次回カルテ作成',
      path: '/next-record',
      icon: 'fas fa-calendar-plus'
    },
    {
      name: 'JSON変換ツール',
      path: '/json-converter',
      icon: 'fas fa-code'
    }
  ];

  return (
    <div className="fixed top-0 left-0 h-full w-64 bg-gray-800 text-white shadow z-10">
      <div className="p-6">
        <h1 className="text-xl font-bold">医療記録システム</h1>
      </div>
      <nav className="mt-6">
        <ul>
          {navigationItems.map((item) => (
            <li key={item.path} className="px-2">
              <Link 
                href={item.path}
                className={`flex items-center py-3 px-4 rounded-lg ${
                  isActive(item.path) 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <i className={`${item.icon} w-6`}></i>
                <span className="ml-2">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="absolute bottom-0 left-0 w-full p-6">
        <div className="flex items-center">
          <div className="bg-gray-600 rounded-full h-10 w-10 flex items-center justify-center">
            <i className="fas fa-user text-gray-300"></i>
          </div>
          <div className="ml-3">
            <p className="font-medium">ユーザー名</p>
            <p className="text-sm text-gray-400">管理者</p>
          </div>
        </div>
      </div>
    </div>
  );
}