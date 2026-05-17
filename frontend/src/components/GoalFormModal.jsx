import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  { value: "NUMERIC_MIN", label: "Numeric", description: "Higher is better, such as revenue or volume." },
  { value: "NUMERIC_MAX", label: "Numeric", description: "Lower is better, such as turnaround time or cost." },
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
  const watchedWeightage = Number(watch("weightage") || 0);
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
        <div className="flex items-center justify-between border-b border-[#2a2a2a] p-6">
          <h2 className="text-lg font-medium tracking-[0.01em]">
            {weightageOnly ? "Adjust Weightage" : isEditing ? "Edit Goal" : "Add Goal"}
          </h2>
          <button onClick={onClose} className="btn h-8 min-h-0 w-8 p-0" aria-label="Close">
            x
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          <Field label="Goal title" error={errors.title?.message} required>
            <input {...register("title")} readOnly={weightageOnly} className="w-full px-4 py-2.5 text-sm read-only:text-[#555]" placeholder="e.g. Achieve quarterly sales target" />
          </Field>

          <Field label="Description">
            <textarea {...register("description")} rows={2} readOnly={weightageOnly} className="w-full resize-none px-4 py-2.5 text-sm read-only:text-[#555]" placeholder="Optional details about this goal" />
          </Field>

          <Field label="Thrust area" error={errors.thrust_area_id?.message} required>
            <select {...register("thrust_area_id")} disabled={weightageOnly} className="w-full px-4 py-2.5 text-sm disabled:text-[#555]">
              <option value="">Select thrust area...</option>
              {thrustAreas.map((ta) => (
                <option key={ta.id} value={ta.id}>{ta.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Unit of measurement" error={errors.uom_type?.message} required>
            <select {...register("uom_type")} disabled={weightageOnly} className="w-full px-4 py-2.5 text-sm disabled:text-[#555]">
              <option value="">Select UoM type...</option>
              {UOM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {selectedUom && (
              <p className="mt-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-xs text-[#888]">
                {selectedUom.description}
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Target" error={errors.target?.message} required>
              <input {...register("target")} type="number" step="any" readOnly={weightageOnly} className="w-full px-4 py-2.5 text-sm read-only:text-[#555]" placeholder={watchedUom === "ZERO" ? "0" : "e.g. 1000000"} />
            </Field>

            <Field label="Weightage (%)" error={errors.weightage?.message} required>
              <input {...register("weightage")} type="number" min="10" max="100" className="w-full px-4 py-2.5 text-sm" placeholder={`max ${remainingWeightage}%`} />
              <p className="mt-1 text-xs text-[#555]">{remainingWeightage}% remaining</p>
            </Field>
          </div>

          <div>
            <div className="progress-track">
              <div
                className={`progress-fill ${isOver ? "fill-danger" : isExact ? "fill-success" : "fill-accent"}`}
                style={{ width: `${used}%` }}
              />
            </div>
            <p className={`mt-2 text-xs ${isOver ? "text-[#c47a7a]" : isExact ? "text-[#7ab88a]" : "text-[#888]"}`}>
              {watchedWeightage || 0}% selected for this goal
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-success flex-1">
              {isSubmitting ? "Saving..." : weightageOnly ? "Save weightage" : isEditing ? "Save changes" : "Add goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#888]">
        {label} {required && <span className="text-[#c47a7a]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-[#c47a7a]">{error}</p>}
    </div>
  );
}
