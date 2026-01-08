import { Sidebar } from '../../components/sidebar';
import { Plus, Bell, ChevronRight } from 'lucide-react';

// 1. Add the props to the Dashboard so it can pass them to the Sidebar
interface DashboardProps {
  onNavigate: (page: string) => void;
  userRole: string;
}

export function Dashboard({ onNavigate, userRole }: DashboardProps) {
  return (
    <div className="flex min-h-screen bg-[#f0f9ff]">
      {/* 2. Pass the required props to Sidebar */}
      <Sidebar 
        activePage="dashboard" 
        onNavigate={onNavigate} 
        userRole={userRole} 
      />

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* ... rest of your code remains the same ... */}
        <header className="flex justify-between items-center mb-8 text-left">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Good Morning, Ms. Anjali Verma Saar!</h1>
            <div className="mt-2 inline-flex items-center gap-2 bg-green-400 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
              <ChevronRight size={16} className="bg-white text-green-400 rounded-full" />
              Live: 10A Math - 35 mins left
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-gray-100">
            <img src="https://ui-avatars.com/api/?name=Anjali+Verma&background=random" alt="User" className="w-10 h-10 rounded-full" />
            <div className="text-sm">
              <p className="font-bold text-gray-800">Ms. Anjali Verma</p>
              <p className="text-gray-400 text-xs text-left">Thursday, Oct 26, 2026</p>
            </div>
          </div>
        </header>

        {/* ... Top Stat Cards ... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard label="Today's Attendance" value="95%" color="blue" />
          <StatCard label="Total Students" value="35" color="green" />
          <StatCard label="Active Alerts" value="1" color="green" />
        </div>

        {/* ... rest of your dashboard content ... */}
      </main>
    </div>
  );
}

// Sub-component for Stat Cards (Same as yours)
function StatCard({label, value, color }: {label: string, value: string, color: string}) {
  const colorClass = color === 'blue' ? 'bg-blue-500' : 'bg-green-400';
  return (
    <div className="bg-[#eefcf5] p-6 rounded-[24px] relative overflow-hidden text-left border border-green-50 shadow-sm">
      <div className={`absolute top-4 right-4 ${colorClass} text-white p-1 rounded-lg`}>
        <Plus size={16} />
      </div>
      <p className="text-gray-500 font-medium text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}