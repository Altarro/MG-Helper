import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { ImagePicker } from '@shared/components/ImagePicker';

const factionFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  goals: z.array(z.object({ value: z.string() })),
  resources: z.array(z.object({ value: z.string() })),
  description: z.string().max(100_000),
  tags: z.array(z.string()).max(50),
  imageId: z.string().nullish(),
  imageAlt: z.string().max(200).default(''),
});

type FactionFormRaw = z.infer<typeof factionFormSchema>;

export interface FactionFormValues {
  name: string;
  goals: string[];
  resources: string[];
  description: string;
  tags: string[];
  imageId?: string | null;
  imageAlt?: string;
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
  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm<FactionFormRaw>({
    resolver: zodResolver(factionFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      goals: (defaultValues?.goals ?? []).map((v) => ({ value: v })),
      resources: (defaultValues?.resources ?? []).map((v) => ({ value: v })),
      description: defaultValues?.description ?? '',
      tags: defaultValues?.tags ?? [],
      imageId: defaultValues?.imageId ?? null,
      imageAlt: defaultValues?.imageAlt ?? '',
    },
  });

  const nameErrorId = errors.name ? 'faction-name-error' : undefined;

  const goalsArr = useFieldArray({ control, name: 'goals' });
  const resourcesArr = useFieldArray({ control, name: 'resources' });

  function handleValidSubmit(raw: FactionFormRaw) {
    return onSubmit({
      ...raw,
      goals: raw.goals.map((g) => g.value).filter(Boolean),
      resources: raw.resources.map((r) => r.value).filter(Boolean),
      imageId: raw.imageId ?? null,
      imageAlt: raw.imageAlt ?? '',
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
          <label className="text-sm font-medium text-surface-800">{label}</label>
          <button
            type="button"
            onClick={() => arr.append({ value: '' })}
            className="app-button-secondary inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors"
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
              className="app-input flex-1 rounded-2xl px-3 py-2 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder={`${label} ${i + 1}…`}
            />
            <button
              type="button"
              onClick={() => arr.remove(i)}
              className="rounded-xl border border-surface-200 p-2 text-surface-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="faction-name" className="text-sm font-medium text-surface-800">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="faction-name"
          {...register('name')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Nazwa frakcji…"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={nameErrorId}
        />
        {errors.name && <p id="faction-name-error" role="alert" className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <Controller
        name="imageId"
        control={control}
        render={({ field }) => (
          <ImagePicker
            idPrefix="faction"
            label="Obrazek"
            imageId={field.value ?? null}
            imageAlt={watch('imageAlt') ?? ''}
            onChange={({ imageId, imageAlt }) => {
              field.onChange(imageId);
              setValue('imageAlt', imageAlt, { shouldDirty: true });
            }}
          />
        )}
      />

      {renderList('Cele', 'Dodaj cel', goalsArr, 'goals', 'Brak celów — dodaj co frakcja chce osiągnąć.')}
      {renderList('Zasoby', 'Dodaj zasób', resourcesArr, 'resources', 'Brak zasobów — dodaj co frakcja posiada.')}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Opis</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="app-button-secondary rounded-2xl px-4 py-3 text-sm font-medium transition-colors">
            Anuluj
          </button>
        )}
        <button type="submit" disabled={isSaving}
          className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50">
          {isSaving ? 'Zapisywanie…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
