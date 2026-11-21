'use client';

import { EXCHANGE_PROGRAMS } from '@/components/exchange/exchangeData';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { ExchangeError, useExchangeActions } from '@/hooks/useExchange';
import { cn } from '@/lib/utils';
import type { ExchangeDestination } from '@/types/entities';
import { DialogTitle } from '@headlessui/react';
import { Check } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * "Klopt dit niet?" beside a destination's programmes: the reader ticks the programmes it is open
 * to, and the difference goes to a moderator as suggestions.
 */
export default function SuggestProgramsDialog({
    destination,
    open,
    onClose,
}: {
    destination: ExchangeDestination;
    open: boolean;
    onClose: () => void;
}) {
    const [opened, setOpened] = useState(0);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setOpened((count) => count + 1);
    }

    return (
        <Dialog isOpen={open} onClose={onClose} size="xl">
            {opened > 0 && <SuggestForm key={opened} destination={destination} onClose={onClose} />}
        </Dialog>
    );
}

function SuggestForm({ destination, onClose }: { destination: ExchangeDestination; onClose: () => void }) {
    const { t } = useTranslation();
    const id = useId();
    const { showToast } = useToast();
    const { suggestPrograms } = useExchangeActions();
    const listed = (code: string) => destination.allPrograms || destination.programs.includes(code);
    const [chosen, setChosen] = useState(() => new Set(EXCHANGE_PROGRAMS.filter(listed)));
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const add = EXCHANGE_PROGRAMS.filter((code) => chosen.has(code) && !listed(code));
    const remove = EXCHANGE_PROGRAMS.filter((code) => !chosen.has(code) && listed(code));

    const toggle = (code: (typeof EXCHANGE_PROGRAMS)[number]) => setChosen((current) => {
        const next = new Set(current);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
    });

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (add.length + remove.length === 0) {
            setError(t('exchange.suggest.nothing'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await suggestPrograms(destination.id, add, remove, note);
            showToast(t('exchange.suggest.sent'), 'success');
            onClose();
        } catch (caught) {
            setError(t('exchange.suggest.failed', { detail: caught instanceof ExchangeError ? caught.detail : '' }));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} noValidate>
            <DialogTitle as="h2" className="m-0 pr-10 text-title-lg font-semibold text-fg">{t('exchange.suggest.title')}</DialogTitle>
            <p className="m-0 mt-1 text-small text-fg-muted">{t('exchange.suggest.intro', { name: destination.name })}</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2" role="group" aria-label={t('exchange.destination.programs')}>
                {EXCHANGE_PROGRAMS.map((code) => {
                    const on = chosen.has(code);
                    const changed = on !== listed(code);
                    return (
                        <button
                            key={code}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(code)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-control border px-3 py-2 text-left transition-colors',
                                on ? 'border-sky-300 bg-surface-selected' : 'border-border bg-surface hover:bg-surface-hover',
                            )}
                        >
                            <span className={cn('grid size-4 shrink-0 place-items-center rounded-[4px] border', on ? 'border-primary bg-primary text-on-primary' : 'border-border-field')}>
                                {on && <Check className="size-3" aria-hidden="true" />}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-small text-fg">
                                <span className="font-semibold">{code}</span> · {t(`exchange.programs.${code}`)}
                            </span>
                            {changed && (
                                <span className={cn('shrink-0 text-caption font-semibold', on ? 'text-success-text' : 'text-danger-text')}>
                                    {on ? '+' : '−'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="vtk-field mt-4">
                <label htmlFor={`${id}-note`} className="vtk-field-label">{t('exchange.suggest.note')}</label>
                <textarea
                    id={`${id}-note`}
                    className="vtk-textarea min-h-16!"
                    rows={2}
                    maxLength={500}
                    placeholder={t('exchange.suggest.note_placeholder')}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />
            </div>

            {error && <p role="alert" className="m-0 mt-3 rounded-control border border-danger-border bg-danger-bg px-3 py-2 text-small text-danger-text">{error}</p>}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="vtk-button" onClick={onClose}>{t('exchange.form.cancel')}</button>
                <button type="submit" className="vtk-button vtk-button-primary" disabled={busy}>
                    {busy ? t('exchange.form.submitting') : t('exchange.suggest.submit')}
                </button>
            </div>
        </form>
    );
}
