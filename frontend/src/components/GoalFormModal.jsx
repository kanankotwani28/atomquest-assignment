import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Zod schema enforces validation at the form level BEFORE hitting the backend
// Why both frontend + backend validation: frontend gives instant feedback,
// backend is the security guarantee (never trust client-only validation)
const goalSchema = z.object({
  title:       z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  thrustAreaId:z.string().min(1, 'Select a thrust area'),
  uomType:     z.enum(['NUMERIC_MIN','NUMERIC_MAX','TIMELINE','ZERO'],
                 { errorMap: () => ({ message: 'Select a unit of measurement' }) }),
  target:      z.coerce.number().positive('Target must be a positive number'),
  weightage:   z.coerce.number()
                 .min(10, 'Minimum weightage is 10%')
                 .max(100, 'Maximum weightage is 100%'),
});

const UOM_OPTIONS = [
  { value: 'NUMERIC_MIN', label: 'Numeric — Higher is better (e.g. Revenue)' },
  { value: 'NUMERIC_MAX', label: 'Numeric — Lower is better (e.g. TAT, Cost)' },
  { value: 'TIMELINE',    label: 'Timeline — Date-based completion' },
  { value: 'ZERO',        label: 'Zero-based — Zero = Success (e.g. Incidents)' },
];

export default function GoalFormModal({
  isOpen, onClose, onSave,
  thrustAreas, existingGoal,
  remainingWeightage
}) {
  const isEditing = !!existingGoal;

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: existingGoal || {
      title: '', description: '', thrustAreaId: '',
      uomType: '', target: '', weightage: ''
    }
  });

  // When editing, populate form with existing values
  useEffect(() => {
    if (existingGoal) reset(existingGoal);
    else reset({ title:'',description:'',thrustAreaId:'',uomType:'',target:'',weightage:'' });
  }, [existingGoal, reset]);

  const watchedUom = watch('uomType');

  const onSubmit = async (data) => {
    await onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    // Backdrop
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Goal' : 'Add New Goal'}
          </h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal title <span className="text-red-500">*</span>
            </label>
            <input {...register('title')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Achieve quarterly sales target" />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea {...register('description')} rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Optional details about this goal" />
          </div>

          {/* Thrust Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thrust area <span className="text-red-500">*</span>
            </label>
            <select {...register('thrustAreaId')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">Select thrust area...</option>
              {thrustAreas.map(ta => (
                <option key={ta.id} value={ta.id}>{ta.name}</option>
              ))}
            </select>
            {errors.thrustAreaId && (
              <p className="text-red-500 text-xs mt-1">{errors.thrustAreaId.message}</p>
            )}
          </div>

          {/* UoM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit of measurement <span className="text-red-500">*</span>
            </label>
            <select {...register('uomType')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">Select UoM type...</option>
              {UOM_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.uomType && (
              <p className="text-red-500 text-xs mt-1">{errors.uomType.message}</p>
            )}
            {/* Contextual hint based on selected UoM */}
            {watchedUom === 'ZERO' && (
              <p className="text-indigo-600 text-xs mt-1 bg-indigo-50 px-3 py-1.5 rounded">
                Set target to 0. Any actual value above 0 scores 0%.
              </p>
            )}
            {watchedUom === 'TIMELINE' && (
              <p className="text-indigo-600 text-xs mt-1 bg-indigo-50 px-3 py-1.5 rounded">
                Enter target as a Unix timestamp (ms) or use the deadline date picker.
              </p>
            )}
          </div>

          {/* Target + Weightage side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target <span className="text-red-500">*</span>
              </label>
              <input {...register('target')} type="number" step="any"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={watchedUom === 'ZERO' ? '0' : 'e.g. 1000000'} />
              {errors.target && (
                <p className="text-red-500 text-xs mt-1">{errors.target.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weightage (%) <span className="text-red-500">*</span>
              </label>
              <input {...register('weightage')} type="number" min="10" max="100"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`max ${remainingWeightage}%`} />
              {errors.weightage && (
                <p className="text-red-500 text-xs mt-1">{errors.weightage.message}</p>
              )}
              <p className="text-gray-400 text-xs mt-1">{remainingWeightage}% remaining</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm
                         font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Add goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}