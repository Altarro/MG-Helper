import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';

const factionFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  goals: z.array(z.object({ value: z.string() })),
  resources: z.array(z.object({ value: z.string() })),
  description: z.string().max(100_000),
  tags: z.array(z.string()).max(50),
});

type FactionFormRaw = z.infer<typeof factionFormSchema>;

export interface FactionFormValues {
  name: string;
  goals: string[];
  resources: string[];
  description: string;
  tags: string[];
}

interface FactionFormProps {
  defaultValues?: Partial<FactionFormValues>;
  onSubmit: (values: FactionFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function FactionForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: FactionFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<FactionFormRaw>({
    resolver: zodResolver(factionFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      goals: (defaultValues?.goals ?? []).map((v) => ({ value: v })),
      resources: (defaultValues?.resources ?? []).map((v) => ({ value: v })),
      description: defaultValues?.description ?? '',
      tags: defaultValues?.tags ?? [],
    },
  });

  const goalsArr = useFieldArray({ control, name: 'goals' });
  const resourcesArr = useFieldArray({ control, name: 'resources' });

  function handleValidSubmit(raw: FactionFormRaw) {
    return onSubmit({
      ...raw,
      goals: raw.goals.map((g) => g.value).filter(Boolean),
      resources: raw.resources.map((r) => r.value).filter(Boolean),
    });
  }

  function renderList(
    label: string,
    addLabel: string,
    arr: typeof goalsArr | typeof resourcesArr,
    fieldName: 'goals' | 'resources',
    placeholder: string,
  ) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-surface-700">{label}</label>
          <button
            type="button"
            onClick={() => arr.append({ value: '' })}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </button>
        </div>
        {arr.fields.length === 0 && (
          <p className="text-xs text-surface-400">{placeholder}</p>
        )}
        {arr.fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`${fieldName}.${i}.value` as const)}
              className="flex-1 rounded-md border border-surface-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder={`${label} ${i + 1}…`}
            />
            <button
              type="button"
              onClick={() => arr.remove(i)}
              className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="faction-name" className="text-sm font-medium text-surface-700">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="faction-name"
          {...register('name')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Nazwa frakcji…"
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && <p role="alert" className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {renderList('Cele', 'Dodaj cel', goalsArr, 'goals', 'Brak celów — dodaj co frakcja chce osiągnąć.')}
      {renderList('Zasoby', 'Dodaj zasób', resourcesArr, 'resources', 'Brak zasobów — dodaj co frakcja posiada.')}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Opis / Historia</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
            Anuluj
          </button>
        )}
        <button type="submit" disabled={isSaving}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
          {isSaving ? 'Zapisywanie…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
