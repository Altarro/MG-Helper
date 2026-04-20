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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="entity-name" className="text-sm font-medium text-surface-800">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="entity-name"
          {...register('name')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Nazwa..."
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Opis</label>
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

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput value={field.value ?? []} onChange={field.onChange} />
          )}
        />
      </div>

      {additionalFields?.(control, register)}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
          >
            Anuluj
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Zapisuję...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
