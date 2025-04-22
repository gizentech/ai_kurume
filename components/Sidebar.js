// components/Sidebar.js
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar() {
  const router = useRouter();
  
  const menuItems = [
    { title: 'ダッシュボード', path: '/', icon: 'fas fa-tachometer-alt' },
    { title: 'AI文章生成', path: '/generation', icon: 'fas fa-robot' },
    { title: '医療記録一覧', path: '/records', icon: 'fas fa-file-medical' },
    { title: '設定', path: '/settings', icon: 'fas fa-cog' },
  ];

  return (
    <div className="bg-blue-800 text-white w-64 fixed h-screen p-4 overflow-y-auto">
      <div className="text-2xl font-bold mb-6 p-2">医療記録システム</div>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.path} className="mb-2">
              <Link href={item.path}>
                <span className={`flex items-center p-2 rounded-lg ${
                  router.pathname === item.path ? 'bg-blue-600' : 'hover:bg-blue-700'
                } transition-colors duration-200`}>
                  <i className={`${item.icon} mr-3`}></i>
                  {item.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}