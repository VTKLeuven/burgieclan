// The VTK events in the study planner: what the week view draws for them. The events come from
// the VTK website (StudyPlannerVtkEvent on the backend); this only picks the language and lays
// out their occurrences.
import type { StudyPlannerVtkEvent, StudyPlannerVtkOccurrence, StudyPlannerVtkOption } from '@/types/entities';
import { addDays } from './time';

export function vtkTitle(event: Pick<StudyPlannerVtkEvent | StudyPlannerVtkOption, 'titleNl' | 'titleEn'>, locale: string): string {
    return (locale === 'en' ? event.titleEn : null) ?? event.titleNl;
}

export function vtkUrl(event: Pick<StudyPlannerVtkEvent | StudyPlannerVtkOption, 'urlNl' | 'urlEn'>, locale: string): string {
    return (locale === 'en' && event.urlEn) || event.urlNl;
}

/** One block or all-day chip of a VTK event on one day of the week view. */
export interface VtkSlot {
    key: string;
    event: StudyPlannerVtkEvent;
    occurrence: StudyPlannerVtkOccurrence;
    date: string;
    startMin: number;
    endMin: number;
    allDay: boolean;
}

/** Every day a VTK event touches between `from` and `to`, an evening past midnight on both days. */
export function vtkSlots(events: StudyPlannerVtkEvent[], from: string, to: string): VtkSlot[] {
    const out: VtkSlot[] = [];
    for (const event of events) {
        for (const occurrence of event.occurrences) {
            let date = occurrence.date;
            let i = 0;
            while (date <= occurrence.endDate) {
                const first = i === 0;
                const last = date === occurrence.endDate;
                const endMin = occurrence.end ? Number(occurrence.end.slice(0, 2)) * 60 + Number(occurrence.end.slice(3, 5)) : 0;
                const slot: VtkSlot = {
                    key: `${occurrence.key}:${i}`,
                    event,
                    occurrence,
                    date,
                    allDay: occurrence.allDay,
                    startMin: occurrence.allDay || !first ? 0 : occurrence.startMin,
                    endMin: occurrence.allDay ? 1440 : first ? occurrence.endMin : last ? Math.max(endMin, 15) : 1440,
                };
                // A night ending at exactly midnight does not reach into the next day.
                const empty = !first && last && !occurrence.allDay && endMin === 0;
                if (!empty && date >= from && date <= to) out.push(slot);
                date = addDays(date, 1);
                i++;
            }
        }
    }
    return out;
}
