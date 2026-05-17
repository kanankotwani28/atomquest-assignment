import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTeamCheckIns } from '../../api/checkins';
import ManagerCheckInRow from '../../components/ManagerCheckInRow';
import ScoreBadge from '../../components/ScoreBadge';
import { Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function ManagerCheckIns() {
  const { user, logout }  = useAuth();
  const [team, setTeam]   = useState([]);
  const [cycle, setCycle] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const fetchData = async () => {
    try {
      const res = await getTeamCheckIns();
      setTeam(res.data.team);
      setCycle(res.data.cycle);
      setCurrentQuarter(res.data.currentQuarter);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading team check-ins...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Team Check-ins</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentQuarter ? `${currentQuarter} window open` : 'No active window'}
              {cycle ? ` · ${cycle.year}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/manager/dashboard"
              className="text-xs text-gray-500 hover:text-gray-700">
              ← Goal approvals
            </Link>
            <span className="text-sm text-gray-600">{user.name}</span>
            <button onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {team.length === 0 ? (
          <p className="text-center text-gray-400 py-20">No team members found.</p>
        ) : (
          team.map(({ employee, goals, overallScore }) => (
            <div key={employee.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Employee header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(e => ({ ...e, [employee.id]: !e[employee.id] }))}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">
                      {employee.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
                    <p className="text-xs text-gray-400">{employee.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Overall score</p>
                    <ScoreBadge score={overallScore} />
                  </div>
                  <span className="text-gray-300">
                    {expanded[employee.id] ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Goals expanded */}
              {expanded[employee.id] && (
                <div className="border-t border-gray-100 p-5 space-y-4">
                  {goals.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No approved goals this cycle
                    </p>
                  ) : (
                    goals.map(goal => (
                      <ManagerCheckInRow
                        key={goal.id}
                        goal={goal}
                        onUpdated={fetchData}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}