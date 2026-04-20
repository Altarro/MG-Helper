import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { TagInput } from '@shared/components/TagInput';
import { RichTextEditor } from '@shared/components/RichTextEditor';

const sessionFormSchema = z.object({
  number: z.coerce.number().int().min(1, 'Numer sesji musi być ≥ 1'),
  date: z.string().min(1, 'Data jest wymagana'),
  name: z.string().max(200).default(''),
  summary: z.string().max(2000).default(''),
  description: z.string().max(100_000).default(''),
  tags: z.array(z.string()).max(50).default([]),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface SessionFormProps {
  defaultValues?: Partial<SessionFormValues>;
  onSubmit: (values: SessionFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
  onCancel?: () => void;
}

export function SessionForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Zapisz',
  isSaving = false,
  onCancel,
}: SessionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      number: 1,
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      summary: '',
      description: '',
      tags: [],
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Number + Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-number" className="text-sm font-medium text-surface-800">
            Nr sesji <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="session-number"
            type="number"
            min={1}
            {...register('number')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            aria-invalid={errors.number ? 'true' : 'false'}
          />
          {errors.number && (
            <p role="alert" className="text-xs text-red-600">{errors.number.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="session-date" className="text-sm font-medium text-surface-800">
            Data <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="session-date"
            type="date"
            {...register('date')}
            className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            aria-invalid={errors.date ? 'true' : 'false'}
          />
          {errors.date && (
            <p role="alert" className="text-xs text-red-600">{errors.date.message}</p>
          )}
        </div>
      </div>

      {/* Optional name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-name" className="text-sm font-medium text-surface-800">Tytuł sesji (opcjonalny)</label>
        <input
          id="session-name"
          {...register('name')}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder={'Np. \u201eUcieczka z Czerwonej Wie\u017cy\u201d...'}
        />
      </div>

      {/* Summary */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-summary" className="text-sm font-medium text-surface-800">Krótkie streszczenie</label>
        <textarea
          id="session-summary"
          {...register('summary')}
          rows={3}
          className="app-input rounded-2xl px-3.5 py-3 text-sm text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y"
          placeholder="Co się wydarzyło w skrócie…"
        />
      </div>

      {/* Notes (Tiptap) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Notatki (szczegółowe)</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-surface-800">Tagi</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
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
