import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyCheckIns } from '../../api/checkins';
import GoalCheckInCard from '../../components/GoalCheckInCard';
import { Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function EmployeeCheckIns() {
  const { user, logout } = useAuth();
  const [goals,          setGoals]          = useState([]);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [cycle,          setCycle]          = useState(null);
  const [loading,        setLoading]        = useState(true);

  const fetchData = async () => {
    try {
      const res = await getMyCheckIns();
      console.log('Employee check-ins loaded:', res.data);
      setGoals(res.data.goals);
      setCurrentQuarter(res.data.currentQuarter);
      setCycle(res.data.cycle);
    } catch {
      // handled silently — component shows empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading check-ins...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Quarterly Check-ins</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentQuarter
                ? `${currentQuarter} window is open`
                : 'No active check-in window'}
              {cycle ? ` · ${cycle.year}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/employee/dashboard"
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
              ← Goal sheet
            </Link>
            <span className="text-sm text-gray-600">{user.name}</span>
            <button onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {!currentQuarter && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
            <p className="text-blue-800 text-sm font-medium">
              Check-in window is currently closed
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Q1 opens in July · Q2 in October · Q3 in January · Q4 in March
            </p>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-medium text-gray-900 mb-2">No approved goals yet</h3>
            <p className="text-sm text-gray-500">
              Check-ins are available once your manager approves your goals.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {goals.map(goal => (
              <GoalCheckInCard
                key={goal.id}
                goal={goal}
                currentQuarter={currentQuarter}
                onSaved={fetchData}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
