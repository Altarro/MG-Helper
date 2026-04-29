import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { ImagePicker } from '@shared/components/ImagePicker';
import { useCampaign } from '@shared/db/CampaignContext';
import { getActiveCatalogOptions, getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';

const itemFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  itemType: z.string().min(1),
  properties: z.array(z.object({ value: z.string() })),
  description: z.string().max(100_000),
  tags: z.array(z.string()).max(50),
  imageId: z.string().nullish(),
  imageAlt: z.string().max(200).default(''),
});

type ItemFormRaw = z.infer<typeof itemFormSchema>;

export interface ItemFormValues {
  name: string;
  itemType: import('../types').ItemType;
  properties: string[];
  description: string;
  tags: string[];
  imageId?: string | null;
  imageAlt?: string;
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
  const { campaignId } = useCampaign();
  const currentItemType = defaultValues?.itemType ?? 'misc';
  const itemTypeBase = getActiveCatalogOptions(campaignId, 'itemType');
  const itemTypeOptions = itemTypeBase.some((x) => x.id === currentItemType)
    ? itemTypeBase
    : [...itemTypeBase, { id: currentItemType, label: getCatalogLabelByValue('itemType', currentItemType, campaignId) }];
  const {
    register,
    control,
    watch,
    setValue,
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
      imageId: defaultValues?.imageId ?? null,
      imageAlt: defaultValues?.imageAlt ?? '',
    },
  });

  const nameErrorId = errors.name ? 'item-name-error' : undefined;

  const propertiesArr = useFieldArray({ control, name: 'properties' });

  function handleValidSubmit(raw: ItemFormRaw) {
    return onSubmit({
      ...raw,
      itemType: raw.itemType as import('../types').ItemType,
      properties: raw.properties.map((p) => p.value).filter(Boolean),
      imageId: raw.imageId ?? null,
      imageAlt: raw.imageAlt ?? '',
    });
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-name" className="text-sm font-medium text-surface-800">
            Nazwa <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="item-name"
            {...register('name')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Nazwa przedmiotu…"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={nameErrorId}
          />
          {errors.name && <p id="item-name-error" role="alert" className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-type" className="text-sm font-medium text-surface-800">Typ</label>
          <select
            id="item-type"
            {...register('itemType')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {itemTypeOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Controller
        name="imageId"
        control={control}
        render={({ field }) => (
          <ImagePicker
            idPrefix="item"
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-surface-800">Właściwości</label>
          <button
            type="button"
            onClick={() => propertiesArr.append({ value: '' })}
            className="app-button-secondary inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors"
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
              className="app-input flex-1 rounded-2xl px-3 py-2 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder={`Właściwość ${i + 1}…`}
            />
            <button
              type="button"
              onClick={() => propertiesArr.remove(i)}
              className="rounded-xl border border-surface-200 p-2 text-surface-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Opis / Historia</label>
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
