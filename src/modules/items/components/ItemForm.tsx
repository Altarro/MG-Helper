import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { ITEM_TYPES, ITEM_TYPE_LABELS } from '../types';

const itemFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  itemType: z.enum(ITEM_TYPES),
  properties: z.array(z.object({ value: z.string() })),
  description: z.string().max(100_000),
  tags: z.array(z.string()).max(50),
});

type ItemFormRaw = z.infer<typeof itemFormSchema>;

export interface ItemFormValues {
  name: string;
  itemType: (typeof ITEM_TYPES)[number];
  properties: string[];
  description: string;
  tags: string[];
}

interface ItemFormProps {
  defaultValues?: Partial<ItemFormValues>;
  onSubmit: (values: ItemFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function ItemForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: ItemFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemFormRaw>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      itemType: defaultValues?.itemType ?? 'misc',
      properties: (defaultValues?.properties ?? []).map((v) => ({ value: v })),
      description: defaultValues?.description ?? '',
      tags: defaultValues?.tags ?? [],
    },
  });

  const propertiesArr = useFieldArray({ control, name: 'properties' });

  function handleValidSubmit(raw: ItemFormRaw) {
    return onSubmit({
      ...raw,
      properties: raw.properties.map((p) => p.value).filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="item-name" className="text-sm font-medium text-surface-700">
            Nazwa <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="item-name"
            {...register('name')}
            className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Nazwa przedmiotu…"
            aria-invalid={errors.name ? 'true' : 'false'}
          />
          {errors.name && <p role="alert" className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="item-type" className="text-sm font-medium text-surface-700">Typ</label>
          <select
            id="item-type"
            {...register('itemType')}
            className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-surface-700">Właściwości</label>
          <button
            type="button"
            onClick={() => propertiesArr.append({ value: '' })}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj właściwość
          </button>
        </div>
        {propertiesArr.fields.length === 0 && (
          <p className="text-xs text-surface-400">Brak właściwości — np. magiczny, ciężki, starożytny.</p>
        )}
        {propertiesArr.fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`properties.${i}.value`)}
              className="flex-1 rounded-md border border-surface-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder={`Właściwość ${i + 1}…`}
            />
            <button
              type="button"
              onClick={() => propertiesArr.remove(i)}
              className="rounded-md border border-surface-200 p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

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
