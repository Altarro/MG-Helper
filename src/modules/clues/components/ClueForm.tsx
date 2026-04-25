import { useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { CLUE_TYPES, CLUE_TYPE_LABELS, normalizeClueTypes } from '../types';

const SINGLE_CLICK_DELAY_MS = 250;

const clueFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string().min(1).max(50)).max(50).default([]),
  clueTypes: z.array(z.enum(CLUE_TYPES)).min(1, 'Wybierz minimum jeden typ wskazówki'),
  hint: z.string().max(2000).default(''),
  discovered: z.boolean().default(false),
});

export type ClueFormValues = z.infer<typeof clueFormSchema>;

interface ClueFormProps {
  defaultValues?: Partial<ClueFormValues>;
  onSubmit: (values: ClueFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ClueForm({ defaultValues, onSubmit, onCancel, isSaving }: ClueFormProps) {
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultClueTypes: ClueFormValues['clueTypes'] = defaultValues?.clueTypes
    ? normalizeClueTypes(defaultValues.clueTypes)
    : ['character'];
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClueFormValues>({
    resolver: zodResolver(clueFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: [],
      hint: '',
      discovered: false,
      ...defaultValues,
      clueTypes: defaultClueTypes,
    },
  });

  const nameErrorId = errors.name ? 'clue-name-error' : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="clue-name" className="text-sm font-medium text-surface-800">
          Nazwa <span className="text-red-500">*</span>
        </label>
        <input
          id="clue-name"
          {...register('name')}
          className="app-input w-full rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="np. Odcisk buta przy drzwiach"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={nameErrorId}
        />
        {errors.name && (
          <p id="clue-name-error" role="alert" className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Typ wskazówki</label>
        <Controller
          control={control}
          name="clueTypes"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CLUE_TYPE_LABELS) as [string, string][]).map(([value, label]) => {
                const isSelected = field.value.includes(value as ClueFormValues['clueTypes'][number]);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (singleClickTimerRef.current) clearTimeout(singleClickTimerRef.current);
                      singleClickTimerRef.current = setTimeout(() => {
                        field.onChange([value as ClueFormValues['clueTypes'][number]]);
                      }, SINGLE_CLICK_DELAY_MS);
                    }}
                    onDoubleClick={() => {
                      if (singleClickTimerRef.current) {
                        clearTimeout(singleClickTimerRef.current);
                        singleClickTimerRef.current = null;
                      }
                      if (isSelected) {
                        // Keep at least one selected type.
                        const next = field.value.filter((item) => item !== value);
                        if (next.length > 0) field.onChange(next);
                        return;
                      }
                      field.onChange([...field.value, value as ClueFormValues['clueTypes'][number]]);
                    }}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      isSelected
                        ? 'app-pill'
                        : 'border border-surface-300 text-surface-600 hover:bg-surface-50'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        />
        <p className="text-surface-500 text-xs">
          Klik: pojedynczy typ. Dwuklik: dodaj/usuń typ (multi). Musi zostać co najmniej jeden.
        </p>
        {errors.clueTypes && (
          <p role="alert" className="text-xs text-red-600">{errors.clueTypes.message}</p>
        )}
      </div>

      {/* Hint */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Wskazówka</label>
        <textarea
          {...register('hint')}
          rows={3}
          className="app-input w-full rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Co gracze mogą z niej wywnioskować lub co bezpośrednio odkrywają…"
        />
      </div>

      {/* Discovered toggle */}
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="discovered"
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                field.value ? 'bg-green-500' : 'bg-surface-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  field.value ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}
        />
        <span className="text-sm font-medium text-surface-800">Odkryta przez graczy</span>
      </div>

      {/* Description (rich text) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Opis (opcjonalny)</label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </form>
  );
}
