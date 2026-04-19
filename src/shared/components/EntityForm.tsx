import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { baseEntitySchema } from '@shared/utils/validation';
import { TagInput } from './TagInput';
import { RichTextEditor } from './RichTextEditor';

export type EntityFormValues = z.infer<typeof baseEntitySchema>;

interface EntityFormProps {
  defaultValues?: Partial<EntityFormValues>;
  onSubmit: (values: EntityFormValues) => void | Promise<void>;
  /** Render additional module-specific fields below the base fields */
  additionalFields?: (
    control: ReturnType<typeof useForm<EntityFormValues>>['control'],
    register: ReturnType<typeof useForm<EntityFormValues>>['register'],
  ) => React.ReactNode;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function EntityForm({
  defaultValues,
  onSubmit,
  additionalFields,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: EntityFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EntityFormValues>({
    resolver: zodResolver(baseEntitySchema),
    defaultValues: {
      name: '',
      description: '',
      tags: [],
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="entity-name" className="text-sm font-medium text-surface-700">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="entity-name"
          {...register('name')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Nazwa…"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Opis</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {errors.description && (
          <p role="alert" className="text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput value={field.value ?? []} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Module-specific extensions */}
      {additionalFields?.(control, register)}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            Anuluj
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSaving ? 'Zapisuję…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
