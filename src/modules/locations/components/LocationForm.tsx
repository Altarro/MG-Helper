import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';
import { ImagePicker } from '@shared/components/ImagePicker';
import { useCampaign } from '@shared/db/CampaignContext';
import { getActiveCatalogOptions, getCatalogLabelByValue } from '@modules/settings/campaignCatalogSettings';
import { useLocations } from '../hooks/useLocations';

const locationFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  locationType: z.string().min(1).default('region'),
  danger: z.coerce.number().int().min(0).max(5).default(0),
  see: z.string().max(1000).default(''),
  hear: z.string().max(1000).default(''),
  smell: z.string().max(1000).default(''),
  feel: z.string().max(1000).default(''),
  parentLocationId: z.string().optional(),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string()).max(50).default([]),
  imageId: z.string().nullish(),
  imageAlt: z.string().max(200).default(''),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;

const DANGER_LABELS = ['Bezpieczna', 'Spokojnie', 'Umiarkowane', 'Niebezpiecznie', 'Śmiertelnie', 'Apokaliptyczne'];

interface LocationFormProps {
  defaultValues?: Partial<LocationFormValues>;
  /** If provided, exclude this ID from parent picker (editing self) */
  excludeId?: string;
  excludeIds?: string[];
  lockedParentId?: string;
  onSubmit: (values: LocationFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function LocationForm({
  defaultValues,
  excludeId,
  excludeIds = [],
  lockedParentId,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: LocationFormProps) {
  const { campaignId } = useCampaign();
  const currentLocationType = defaultValues?.locationType ?? 'region';
  const locationTypeBase = getActiveCatalogOptions(campaignId, 'locationType');
  const locationTypeOptions = locationTypeBase.some((x) => x.id === currentLocationType)
    ? locationTypeBase
    : [
        ...locationTypeBase,
        { id: currentLocationType, label: getCatalogLabelByValue('locationType', currentLocationType, campaignId) },
      ];
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: '',
      locationType: 'region',
      danger: 0,
      see: '',
      hear: '',
      smell: '',
      feel: '',
      parentLocationId: lockedParentId,
      description: '',
      tags: [],
      imageId: null,
      imageAlt: '',
      ...defaultValues,
    },
  });

  const allLocations = useLocations();
  const excludedIds = new Set([excludeId, ...excludeIds].filter((id): id is string => !!id));
  const parentOptions = allLocations?.filter((location) => !excludedIds.has(location.id)) ?? [];
  const dangerValue = watch('danger');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="loc-name" className="text-sm font-medium text-surface-800">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="loc-name"
          {...register('name')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Nazwa lokacji…"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'loc-name-error' : undefined}
        />
        {errors.name && (
          <p id="loc-name-error" role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Cover image */}
      <Controller
        name="imageId"
        control={control}
        render={({ field }) => (
          <ImagePicker
            idPrefix="loc"
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

      {/* Type + Danger */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="loc-type" className="text-sm font-medium text-surface-800">Typ</label>
          <select
            id="loc-type"
            {...register('locationType')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {locationTypeOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="loc-danger" className="text-sm font-medium text-surface-800">
            Niebezpieczeństwo: <span className="font-normal text-surface-500">{DANGER_LABELS[dangerValue] ?? dangerValue}</span>
          </label>
          <input
            id="loc-danger"
            type="range"
            min={0}
            max={5}
            step={1}
            {...register('danger')}
            className="accent-primary-600"
          />
        </div>
      </div>

      {/* Parent location */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="loc-parent" className="text-sm font-medium text-surface-800">Lokacja nadrzędna</label>
        <Controller
          name="parentLocationId"
          control={control}
          render={({ field }) => (
            lockedParentId ? (
              <>
                <input
                  type="hidden"
                  name={field.name}
                  value={lockedParentId}
                  ref={field.ref}
                  readOnly
                />
                <div className="app-input-shell rounded-2xl border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-600">
                  Relacja nadrzedna zostanie ustawiona automatycznie dla tej podlokacji.
                </div>
              </>
            ) : (
              <select
                id="loc-parent"
                name={field.name}
                ref={field.ref}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">— brak —</option>
                {parentOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )
          )}
        />
      </div>

      {/* Senses */}
      <fieldset className="rounded-lg border border-surface-200 p-4">
        <legend className="px-1 text-sm font-medium text-surface-800">Zmysły</legend>
        <div className="flex flex-col gap-3">
          {(
            [
              { field: 'see', label: 'Widzisz' },
              { field: 'hear', label: 'Słyszysz' },
              { field: 'smell', label: 'Czujesz (zapach)' },
              { field: 'feel', label: 'Czujesz (atmosfera)' },
            ] as const
          ).map(({ field, label }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label htmlFor={`loc-${field}`} className="text-xs font-medium text-surface-600">{label}</label>
              <input
                id={`loc-${field}`}
                {...register(field)}
                className="app-input rounded-2xl px-3.5 py-2 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="…"
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Opis / Notatki</label>
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

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Actions */}
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
          {isSaving ? 'Zapisywanie…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
