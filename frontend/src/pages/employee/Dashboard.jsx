import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getMyGoals,
  getThrustAreas,
  getActiveCycle,
  createGoal,
  updateGoal,
  deleteGoal,
  submitAllGoals,
} from "../../api/goals";
import GoalCard from "../../components/GoalCard";
import GoalFormModal from "../../components/GoalFormModal";
import WeightageBar from "../../components/WeightageBar";
import toast, { Toaster } from "react-hot-toast";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      const res = await getMyGoals();
      console.log("Goals API response:", res.data);
      // API returns List[GoalOut] directly, not wrapped in a goals/cycle object
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    Promise.all([
      getThrustAreas()
        .then((r) => setThrustAreas(r.data))
        .catch(() => {}),
      getActiveCycle()
        .then((r) => setCycle(r.data))
        .catch(() => {}),
    ]);
  }, []);

  const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0);
  const remainingWeightage = Math.max(0, 100 - totalWeightage);

  const hasEditableGoals = goals.some((g) =>
    ["DRAFT", "RETURNED"].includes(g.status),
  );
  const allApproved =
    goals.length > 0 && goals.every((g) => g.status === "APPROVED");
  const canSubmit =
    goals.filter((g) => g.status === "DRAFT").length > 0 &&
    Math.round(totalWeightage) === 100;

  const handleSave = async (data) => {
    try {
      console.log("Saving goal with data:", data);
      if (editingGoal) {
        const res = await updateGoal(editingGoal.id, data);
        console.log("Update response:", res);
        toast.success("Goal updated");
      } else {
        const res = await createGoal(data);
        console.log("Create response:", res);
        toast.success("Goal added");
      }
      setEditingGoal(null);
      await fetchGoals();
    } catch (err) {
      console.error("Error saving goal:", err);
      console.error("Error response:", err.response?.data);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to save goal";
      toast.error(errorMsg);
      throw err; // keeps modal open on error
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this goal?")) return;
    try {
      await deleteGoal(id);
      toast.success("Goal deleted");
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete goal");
    }
  };

  const handleSubmitAll = async () => {
    if (
      !confirm(
        "Submit all draft goals for manager approval? You cannot edit them after submission.",
      )
    )
      return;
    try {
      const res = await submitAllGoals();
      toast.success(res.data.message);
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Submission failed");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading your goals...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">My Goals</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {cycle ? `${cycle.year} · ${cycle.phase}` : "Active cycle"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Link
              to="/employee/checkins"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Check-ins →
            </Link>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Weightage tracker */}
        <WeightageBar goals={goals} />

        {/* Status banner */}
        {allApproved && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <p className="text-green-700 text-sm font-medium">
              ✓ All goals approved by your manager
            </p>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            {goals.length} goal{goals.length !== 1 ? "s" : ""} · {cycle?.year}
          </h2>
          <div className="flex gap-3">
            {hasEditableGoals && goals.length < 8 && (
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setModalOpen(true);
                }}
                className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg
                           hover:bg-indigo-700 transition-colors font-medium"
              >
                + Add goal
              </button>
            )}
            {canSubmit && (
              <button
                onClick={handleSubmitAll}
                className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg
                           hover:bg-green-700 transition-colors font-medium"
              >
                Submit for approval
              </button>
            )}
          </div>
        </div>

        {/* Goals grid */}
        {goals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="font-medium text-gray-900 mb-2">No goals yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Start by adding your first goal for this cycle.
            </p>
            <button
              onClick={() => {
                setEditingGoal(null);
                setModalOpen(true);
              }}
              className="text-sm px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add first goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(g) => {
                  setEditingGoal(g);
                  setModalOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Submission hint */}
        {hasEditableGoals &&
          Math.round(totalWeightage) !== 100 &&
          goals.length > 0 && (
            <p className="text-center text-xs text-gray-400">
              Total weightage must equal 100% before you can submit. Currently
              at {totalWeightage.toFixed(1)}%.
            </p>
          )}
      </main>

      <GoalFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSave}
        thrustAreas={thrustAreas}
        existingGoal={editingGoal}
        remainingWeightage={
          editingGoal
            ? remainingWeightage + editingGoal.weightage // add back current goal's weight when editing
            : remainingWeightage
        }
      />
    </div>
  );
}
