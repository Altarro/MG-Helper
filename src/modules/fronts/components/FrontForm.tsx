import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { FRONT_CATEGORIES, FRONT_CATEGORY_LABELS } from '../types';

// Internal form schema - stakes stored as objects for useFieldArray compatibility
const frontFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  category: z.enum(FRONT_CATEGORIES),
  goal: z.string().max(2000).default(''),
  stakes: z.array(z.object({ value: z.string() })),
  description: z.string().max(100_000),
  tags: z.array(z.string()).max(50),
});

type FrontFormRaw = z.infer<typeof frontFormSchema>;

// Public type used by callers - stakes are plain strings
export interface FrontFormValues {
  name: string;
  category: (typeof FRONT_CATEGORIES)[number];
  goal: string;
  stakes: string[];
  description: string;
  tags: string[];
}

interface FrontFormProps {
  defaultValues?: Partial<FrontFormValues>;
  onSubmit: (values: FrontFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function FrontForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: FrontFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FrontFormRaw>({
    resolver: zodResolver(frontFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      category: defaultValues?.category ?? 'campaign',
      goal: defaultValues?.goal ?? '',
      stakes: (defaultValues?.stakes ?? []).map((v) => ({ value: v })),
      description: defaultValues?.description ?? '',
      tags: defaultValues?.tags ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'stakes' });

  function handleValidSubmit(raw: FrontFormRaw) {
    return onSubmit({
      ...raw,
      stakes: raw.stakes.map((s) => s.value).filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="front-name" className="text-surface-800 text-sm font-medium">
          Nazwa{' '}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="front-name"
          {...register('name')}
          className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 rounded-2xl px-3.5 py-3 text-sm focus:ring-2 focus:outline-none"
          placeholder="Nazwa frontu..."
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="front-category" className="text-surface-800 text-sm font-medium">
          Kategoria
        </label>
        <select
          id="front-category"
          {...register('category')}
          className="app-input text-surface-900 focus:border-primary-500 focus:ring-primary-500/20 rounded-2xl px-3.5 py-3 text-sm focus:ring-2 focus:outline-none"
        >
          {FRONT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {FRONT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="front-goal" className="text-surface-800 text-sm font-medium">
          Cel frontu
        </label>
        <textarea
          id="front-goal"
          {...register('goal')}
          rows={3}
          className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 resize-none rounded-2xl px-3.5 py-3 text-sm focus:ring-2 focus:outline-none"
          placeholder="Co front chce osiągnąć? Jakie jest jego przeznaczenie?"
        />
      </div>

      <div className="app-panel rounded-[1.45rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-surface-800 text-sm font-medium">Stawki</label>
          <button
            type="button"
            onClick={() => append({ value: '' })}
            className="text-primary-700 hover:text-primary-800 inline-flex items-center gap-1 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj stawkę
          </button>
        </div>

        {fields.length === 0 && (
          <p className="text-surface-500 mt-2 text-xs leading-6">
            Brak stawek - dodaj, czym ryzykują bohaterowie.
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex gap-2">
              <input
                {...register(`stakes.${i}.value`)}
                className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 flex-1 rounded-2xl px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                placeholder={`Stawka ${i + 1}...`}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Usuń stawkę"
                className="app-button-secondary text-surface-600 rounded-2xl p-2.5 transition-colors hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-surface-800 text-sm font-medium">Opis / Notatki</label>
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-surface-800 text-sm font-medium">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
      </div>

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
          {isSaving ? 'Zapisywanie...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
