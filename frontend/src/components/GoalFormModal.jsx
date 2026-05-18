import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";

const goalSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  thrust_area_id: z.string().min(1, "Select a thrust area"),
  uom_type: z.enum(["NUMERIC_MIN", "NUMERIC_MAX", "PERCENTAGE", "TIMELINE", "ZERO"], { errorMap: () => ({ message: "Select a unit of measurement" }) }),
  target: z.union([z.string(), z.number()]),
  weightage: z.coerce.number().min(10, "Minimum weightage is 10%").max(100, "Maximum weightage is 100%"),
}).refine((data) => {
  if (data.uom_type === "ZERO") return data.target === "0" || data.target === 0;
  if (data.uom_type === "PERCENTAGE") {
    const t = parseFloat(data.target);
    return !isNaN(t) && t > 0 && t <= 100;
  }
  if (data.uom_type !== "TIMELINE" && parseFloat(data.target) <= 0) return false;
  return true;
}, (data) => {
  if (data.uom_type === "ZERO") return { message: "Target must be 0 for ZERO-type goals", path: ["target"] };
  if (data.uom_type === "PERCENTAGE") return { message: "Target must be between 0 and 100", path: ["target"] };
  return { message: "Target must be greater than 0", path: ["target"] };
});

const sharedGoalSchema = z.object({ weightage: z.coerce.number().min(10, "Minimum weightage is 10%").max(100, "Maximum weightage is 100%") });

const UOM_OPTIONS = [
  { value: "NUMERIC_MIN", label: "Numeric (higher is better)", description: "Higher is better, such as revenue or volume." },
  { value: "NUMERIC_MAX", label: "Numeric (lower is better)", description: "Lower is better, such as turnaround time or cost." },
  { value: "PERCENTAGE", label: "Percentage (%)", description: "Target is a percentage value, e.g. 95%." },
  { value: "TIMELINE", label: "Timeline", description: "Date-based completion against a deadline." },
  { value: "ZERO", label: "Zero-based", description: "Target stays at 0; any non-zero actual scores 0%." },
];

export default function GoalFormModal({ isOpen, onClose, onSave, thrustAreas, existingGoal, remainingWeightage }) {
  const isEditing = !!existingGoal;
  const isSharedGoal = !!existingGoal?.isShared;
  const isRevisionGoal = existingGoal?.status === "REVISION_REQUIRED";
  const weightageOnly = isSharedGoal || isRevisionGoal;

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(weightageOnly ? sharedGoalSchema : goalSchema),
    defaultValues: existingGoal || { title: "", description: "", thrust_area_id: "", uom_type: "", target: "", weightage: "" },
  });

  useEffect(() => {
    if (existingGoal) {
      const resetData = {
        title: existingGoal.title,
        description: existingGoal.description,
        thrust_area_id: existingGoal.thrust_area_id || existingGoal.thrustAreaId,
        uom_type: existingGoal.uom_type || existingGoal.uomType,
        target: existingGoal.uom_type === "TIMELINE" || existingGoal.uomType === "TIMELINE"
          ? existingGoal.target ? new Date(existingGoal.target).toISOString().split("T")[0] : ""
          : existingGoal.target,
        weightage: existingGoal.weightage
      };
      reset(resetData);
    } else {
      reset({ title: "", description: "", thrust_area_id: "", uom_type: "", target: "", weightage: "" });
    }
  }, [existingGoal, reset]);

  const watchedUom = watch("uom_type");
  const watchedWeightage = watch("weightage") ? Number(watch("weightage")) : 0;
  const selectedUom = UOM_OPTIONS.find((opt) => opt.value === watchedUom);
  const used = Math.min(watchedWeightage, 100);
  const isExact = watchedWeightage === remainingWeightage;
  const isOver = watchedWeightage > remainingWeightage;

  const onSubmit = async (data) => {
    try {
      const payload = weightageOnly ? { weightage: data.weightage } : { ...data };
      if (!weightageOnly && data.uom_type === "TIMELINE" && data.target) {
        payload.target = new Date(data.target).getTime();
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal-panel">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">{weightageOnly ? "Adjust Weightage" : isEditing ? "Edit Goal" : "Add Goal"}</h2>
          <button onClick={onClose} className="admin-modal-close"><X size={14} strokeWidth={1.5} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="admin-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="admin-modal-field">
              <label className="admin-label">Goal title <span style={{ color: "#EF4444" }}>*</span></label>
              <input {...register("title")} readOnly={weightageOnly} className="admin-input" placeholder="e.g. Achieve quarterly sales target" />
              {errors.title && <span style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>{errors.title.message}</span>}
            </div>

            <div className="admin-modal-field">
              <label className="admin-label">Description</label>
              <textarea {...register("description")} rows={2} readOnly={weightageOnly} className="admin-input" style={{ minHeight: 60, height: "auto", paddingTop: 10 }} placeholder="Optional details about this goal" />
            </div>

            <div className="admin-modal-field">
              <label className="admin-label">Thrust area <span style={{ color: "#EF4444" }}>*</span></label>
              <select {...register("thrust_area_id")} disabled={weightageOnly} className="admin-input">
                <option value="">Select thrust area...</option>
                {thrustAreas.map((ta) => <option key={ta.id} value={ta.id}>{ta.name}</option>)}
              </select>
              {errors.thrust_area_id && <span style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>{errors.thrust_area_id.message}</span>}
            </div>

            <div className="admin-modal-field">
              <label className="admin-label">Unit of measurement <span style={{ color: "#EF4444" }}>*</span></label>
              <select {...register("uom_type")} disabled={weightageOnly} className="admin-input">
                <option value="">Select UoM type...</option>
                {UOM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {selectedUom && (
                <div style={{ padding: "8px 10px", background: "rgba(8,20,47,0.80)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{selectedUom.description}</span>
                </div>
              )}
              {errors.uom_type && <span style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>{errors.uom_type.message}</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="admin-modal-field">
                <label className="admin-label">Target <span style={{ color: "#EF4444" }}>*</span></label>
                <input {...register("target")} type={watchedUom === "TIMELINE" ? "date" : "number"} step={watchedUom === "PERCENTAGE" ? "1" : "any"} min={watchedUom === "PERCENTAGE" ? "0" : undefined} max={watchedUom === "PERCENTAGE" ? "100" : undefined} readOnly={weightageOnly} className="admin-input" placeholder={watchedUom === "ZERO" ? "0" : watchedUom === "PERCENTAGE" ? "e.g. 95" : "e.g. 1000000"} />
                {errors.target && <span style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>{errors.target.message}</span>}
              </div>
              <div className="admin-modal-field">
                <label className="admin-label">Weightage % <span style={{ color: "#EF4444" }}>*</span></label>
                <input {...register("weightage")} type="number" min="10" max="100" className="admin-input" placeholder={`max ${remainingWeightage}%`} />
                <span style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{remainingWeightage}% remaining</span>
                {errors.weightage && <span style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>{errors.weightage.message}</span>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: isOver ? "#EF4444" : isExact ? "#10B981" : "#818CF8", width: `${used}%`, transition: "width 300ms ease" }} />
              </div>
              <span style={{ fontSize: 11, color: isOver ? "#EF4444" : isExact ? "#10B981" : "#64748B" }}>
                {watchedWeightage || 0}% selected for this goal
              </span>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" onClick={onClose} className="admin-btn">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn--primary">
              {isSubmitting ? "Saving..." : weightageOnly ? "Save Weightage" : isEditing ? "Save Changes" : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
