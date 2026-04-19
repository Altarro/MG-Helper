import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';

const npcFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  instinct: z.string().max(500).default(''),
  motivation: z.string().max(500).default(''),
  appearance: z.string().max(1000).default(''),
  playStyle: z.string().max(1000).default(''),
  isPC: z.boolean().default(false),
  playerName: z.string().max(200).default(''),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string()).max(50).default([]),
});

export type NpcFormValues = z.infer<typeof npcFormSchema>;

interface NpcFormProps {
  defaultValues?: Partial<NpcFormValues>;
  onSubmit: (values: NpcFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function NpcForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: NpcFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NpcFormValues>({
    resolver: zodResolver(npcFormSchema),
    defaultValues: {
      name: '',
      instinct: '',
      motivation: '',
      appearance: '',
      isPC: false,
      playerName: '',
      description: '',
      tags: [],
      ...defaultValues,
    },
  });

  const isPC = watch('isPC');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="npc-name" className="text-sm font-medium text-surface-700">
          Nazwa <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="npc-name"
          {...register('name')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Imię / nazwa NPC…"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'npc-name-error' : undefined}
        />
        {errors.name && (
          <p id="npc-name-error" role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Instinct */}
      <div className="flex flex-col gap-1">
        <label htmlFor="npc-instinct" className="text-sm font-medium text-surface-700">
          Instynkt
        </label>
        <input
          id="npc-instinct"
          {...register('instinct')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder={'np. \u201ePolować na słabych\u201d'}
        />
      </div>

      {/* Motivation */}
      <div className="flex flex-col gap-1">
        <label htmlFor="npc-motivation" className="text-sm font-medium text-surface-700">
          Motywacja
        </label>
        <input
          id="npc-motivation"
          {...register('motivation')}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Co chce osiągnąć?"
        />
      </div>

      {/* Appearance */}
      <div className="flex flex-col gap-1">
        <label htmlFor="npc-appearance" className="text-sm font-medium text-surface-700">
          Wygląd
        </label>
        <textarea
          id="npc-appearance"
          {...register('appearance')}
          rows={3}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="Jak wygląda? Co rzuca się w oczy?"
        />
      </div>

      {/* Play style */}
      <div className="flex flex-col gap-1">
        <label htmlFor="npc-playStyle" className="text-sm font-medium text-surface-700">
          Sposób odgrywania
        </label>
        <textarea
          id="npc-playStyle"
          {...register('playStyle')}
          rows={3}
          className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="Jak go grać? Ton głosu, gesty, zachowanie…"
        />
      </div>

      {/* Player character toggle */}
      <div className="flex items-center gap-3">
        <Controller
          name="isPC"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${field.value ? 'bg-primary-600' : 'bg-surface-300'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${field.value ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          )}
        />
        <label className="text-sm font-medium text-surface-700">Postać gracza</label>
      </div>

      {/* Player name (visible when isPC) */}
      {isPC && (
        <div className="flex flex-col gap-1">
          <label htmlFor="npc-playerName" className="text-sm font-medium text-surface-700">
            Imię gracza
          </label>
          <input
            id="npc-playerName"
            {...register('playerName')}
            className="rounded-md border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Kto gra tą postacią?"
          />
        </div>
      )}

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Notatki</label>
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
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-surface-700">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} />
          )}
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
