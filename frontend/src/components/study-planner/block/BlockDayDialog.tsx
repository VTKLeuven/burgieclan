'use client';

import { Dialog } from '@/components/ui/Dialog';
import { DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import type { PlannerApi } from '../useStudyPlanner';
import DayDetails from './DayDetails';
import type { BlokView } from './model';
import type { VtkStudyHandle } from './useVtkStudy';

/** One day of the "Blok" calendar in a dialog, for the week view. */
export default function BlockDayDialog({
    date,
    view,
    api,
    vtk,
    onClose,
}: {
    date: string | null;
    view: BlokView;
    api: PlannerApi;
    vtk: VtkStudyHandle;
    onClose: () => void;
}) {
    // Keep the last date on screen while the dialog fades out.
    const [shown, setShown] = useState(date);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (date) setShown(date);
    }, [date]);
    const current = date ?? shown;

    return (
        <Dialog isOpen={date !== null} onClose={onClose} size="lg">
            {current && <DayDetails key={current} date={current} view={view} api={api} vtk={vtk} Title={DialogTitle} />}
        </Dialog>
    );
}
