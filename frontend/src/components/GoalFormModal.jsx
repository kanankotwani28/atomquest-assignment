import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";

const goalSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().optional(),
    thrust_area_id: z.string().min(1, "Select a thrust area"),
    uom_type: z.enum(["NUMERIC_MIN", "NUMERIC_MAX", "TIMELINE", "ZERO"], {
      errorMap: () => ({ message: "Select a unit of measurement" }),
    }),
    target: z.coerce.number(),
    weightage: z.coerce.number().min(10, "Minimum weightage is 10%").max(100, "Maximum weightage is 100%"),
  })
  .refine(
    (data) => {
      if (data.uom_type === "ZERO" && data.target !== 0) return false;
      if (data.uom_type !== "ZERO" && data.target <= 0) return false;
      return true;
    },
    (data) => ({
      message:
        data.uom_type === "ZERO"
          ? "Target must be 0 for ZERO-type goals"
          : "Target must be greater than 0 for this UoM type",
      path: ["target"],
    }),
  );

const sharedGoalSchema = z.object({
  weightage: z.coerce.number().min(10, "Minimum weightage is 10%").max(100, "Maximum weightage is 100%"),
});

const UOM_OPTIONS = [
  { value: "NUMERIC_MIN", label: "Numeric (higher is better)", description: "Higher is better, such as revenue or volume." },
  { value: "NUMERIC_MAX", label: "Numeric (lower is better)", description: "Lower is better, such as turnaround time or cost." },
  { value: "TIMELINE", label: "Timeline", description: "Date-based completion against a deadline." },
  { value: "ZERO", label: "Zero-based", description: "Target stays at 0; any non-zero actual scores 0%." },
];

export default function GoalFormModal({
  isOpen,
  onClose,
  onSave,
  thrustAreas,
  existingGoal,
  remainingWeightage,
}) {
  const isEditing = !!existingGoal;
  const isSharedGoal = !!existingGoal?.isShared;
  const isRevisionGoal = existingGoal?.status === "REVISION_REQUIRED";
  const weightageOnly = isSharedGoal || isRevisionGoal;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(weightageOnly ? sharedGoalSchema : goalSchema),
    defaultValues: existingGoal || {
      title: "",
      description: "",
      thrust_area_id: "",
      uom_type: "",
      target: "",
      weightage: "",
    },
  });

  useEffect(() => {
    if (existingGoal) {
      reset({
        title: existingGoal.title,
        description: existingGoal.description,
        thrust_area_id: existingGoal.thrust_area_id || existingGoal.thrustAreaId,
        uom_type: existingGoal.uom_type || existingGoal.uomType,
        target: existingGoal.target,
        weightage: existingGoal.weightage,
      });
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
      await onSave(weightageOnly ? { weightage: data.weightage } : data);
      onClose();
    } catch (err) {
      console.error("Save error caught in form:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {weightageOnly ? "Adjust Weightage" : isEditing ? "Edit Goal" : "Add Goal"}
          </h2>
          <button 
            onClick={onClose} 
            className="btn-ghost text-[#555] hover:text-[#999] transition-colors p-1"
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form Body and Footer */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body space-y-4 max-h-[70vh] overflow-y-auto">
            <Field label="Goal title" error={errors.title?.message} required>
              <input 
                {...register("title")} 
                readOnly={weightageOnly} 
                className="aq-input w-full" 
                placeholder="e.g. Achieve quarterly sales target" 
              />
            </Field>

            <Field label="Description">
              <textarea 
                {...register("description")} 
                rows={2} 
                readOnly={weightageOnly} 
                className="aq-input w-full" 
                placeholder="Optional details about this goal" 
              />
            </Field>

            <Field label="Thrust area" error={errors.thrust_area_id?.message} required>
              <select 
                {...register("thrust_area_id")} 
                disabled={weightageOnly} 
                className="aq-input w-full"
              >
                <option value="">Select thrust area...</option>
                {thrustAreas.map((ta) => (
                  <option key={ta.id} value={ta.id}>{ta.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Unit of measurement" error={errors.uom_type?.message} required>
              <select 
                {...register("uom_type")} 
                disabled={weightageOnly} 
                className="aq-input w-full"
              >
                <option value="">Select UoM type...</option>
                {UOM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {selectedUom && (
                <p className="mt-2 rounded border border-[#222222] bg-[#161616] px-3 py-2 text-xs text-[#555555]">
                  {selectedUom.description}
                </p>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Target" error={errors.target?.message} required>
                <input 
                  {...register("target")} 
                  type={watchedUom === "TIMELINE" ? "date" : "number"} 
                  step="any" 
                  readOnly={weightageOnly} 
                  className="aq-input w-full" 
                  placeholder={watchedUom === "ZERO" ? "0" : "e.g. 1000000"} 
                />
              </Field>

              <Field label="Weightage (%)" error={errors.weightage?.message} required>
                <input 
                  {...register("weightage")} 
                  type="number" 
                  min="10" 
                  max="100" 
                  className="aq-input w-full" 
                  placeholder={`max ${remainingWeightage}%`} 
                />
                <p className="mt-1 text-[11px] text-[#555555]">{remainingWeightage}% remaining</p>
              </Field>
            </div>

            <div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${isOver ? "poor" : isExact ? "excellent" : "good"}`}
                  style={{ width: `${used}%` }}
                />
              </div>
              <p className={`mt-2 text-xs ${isOver ? "text-[#c44a4a]" : isExact ? "text-[#4d9966]" : "text-[#909090]"}`}>
                {watchedWeightage || 0}% selected for this goal
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="btn btn-confirm"
            >
              {isSubmitting ? "Saving..." : weightageOnly ? "Save Weightage" : isEditing ? "Save Changes" : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em]">
        {label} {required && <span className="text-[#c44a4a]">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-[#c44a4a] mt-1">{error}</p>}
    </div>
  );
}
