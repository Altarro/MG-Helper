import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { FRONT_CATEGORIES, FRONT_CATEGORY_LABELS } from '../types';

// Internal form schema — stakes stored as objects for useFieldArray compatibility
const frontFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  category: z.enum(FRONT_CATEGORIES),
  goal: z.string().max(2000).default(''),
  stakes: z.array(z.object({ value: z.string() })),
  description: z.string().max(100_000),
  tags: z.array(z.string()).max(50),
});

type FrontFormRaw = z.infer<typeof frontFormSchema>;

// Public type used by callers — stakes are plain strings
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
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="front-name" className="text-sm font-medium text-surface-700">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="front-name"
          {...register('name')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Nazwa frontu…"
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label htmlFor="front-category" className="text-sm font-medium text-surface-700">
          Kategoria
        </label>
        <select
          id="front-category"
          {...register('category')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {FRONT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{FRONT_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {/* Goal */}
      <div className="flex flex-col gap-1">
        <label htmlFor="front-goal" className="text-sm font-medium text-surface-700">
          Cel frontu
        </label>
        <textarea
          id="front-goal"
          {...register('goal')}
          rows={3}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder={'Co front chce osiągnąć? Jakie jest jego przeznaczenie?'}
        />
      </div>

      {/* Stakes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-surface-700">Stawki</label>
          <button
            type="button"
            onClick={() => append({ value: '' })}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj stawkę
          </button>
        </div>
        {fields.length === 0 && (
          <p className="text-xs text-surface-400">Brak stawek — dodaj czym ryzykują bohaterowie.</p>
        )}
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`stakes.${i}.value`)}
              className="flex-1 rounded-md border border-surface-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder={`Stawka ${i + 1}…`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Usuń stawkę"
              className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Opis / Notatki</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
      </div>

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
          {isSaving ? 'Zapisywanie…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
