import type { ExchangeDestination, ExchangeTopic } from '@/types/entities';
import { BedDouble, FileText, GraduationCap, MoreHorizontal, Sun, TramFront, type LucideIcon } from 'lucide-react';

/** The faculty's masters by the code students use (backend App\Constants\ExchangeProgram). */
export const EXCHANGE_PROGRAMS = ['ARCH', 'AI', 'BMT', 'BWK', 'CIT', 'CW', 'ELT', 'ENE', 'MTK', 'MSCE', 'NANO', 'WIT', 'WTK'] as const;

export const TOPIC_ICONS: Record<ExchangeTopic, LucideIcon> = {
    general: FileText,
    education: GraduationCap,
    housing: BedDouble,
    life: Sun,
    transport: TramFront,
    other: MoreHorizontal,
};

/** Whether this destination is listed for the programme. */
export const offersProgram = (destination: ExchangeDestination, program: string): boolean =>
    destination.allPrograms || destination.programs.includes(program);

/**
 * Countries a student might add a destination in, named in Dutch and English. A table of its own
 * rather than Intl.DisplayNames: Node and the browser name some countries differently ("Hongkong"
 * against "Hongkong SAR van China"), which broke hydration of the server-rendered list.
 */
const COUNTRY_NAMES: Record<string, [string, string]> = {
    AR: ['Argentinië', 'Argentina'],
    AT: ['Oostenrijk', 'Austria'],
    AU: ['Australië', 'Australia'],
    BE: ['België', 'Belgium'],
    BG: ['Bulgarije', 'Bulgaria'],
    BR: ['Brazilië', 'Brazil'],
    CA: ['Canada', 'Canada'],
    CH: ['Zwitserland', 'Switzerland'],
    CL: ['Chili', 'Chile'],
    CN: ['China', 'China'],
    CO: ['Colombia', 'Colombia'],
    CY: ['Cyprus', 'Cyprus'],
    CZ: ['Tsjechië', 'Czechia'],
    DE: ['Duitsland', 'Germany'],
    DK: ['Denemarken', 'Denmark'],
    EE: ['Estland', 'Estonia'],
    EG: ['Egypte', 'Egypt'],
    ES: ['Spanje', 'Spain'],
    FI: ['Finland', 'Finland'],
    FR: ['Frankrijk', 'France'],
    GB: ['Verenigd Koninkrijk', 'United Kingdom'],
    GR: ['Griekenland', 'Greece'],
    HK: ['Hongkong', 'Hong Kong'],
    HR: ['Kroatië', 'Croatia'],
    HU: ['Hongarije', 'Hungary'],
    ID: ['Indonesië', 'Indonesia'],
    IE: ['Ierland', 'Ireland'],
    IL: ['Israël', 'Israel'],
    IN: ['India', 'India'],
    IS: ['IJsland', 'Iceland'],
    IT: ['Italië', 'Italy'],
    JP: ['Japan', 'Japan'],
    KR: ['Zuid-Korea', 'South Korea'],
    LT: ['Litouwen', 'Lithuania'],
    LU: ['Luxemburg', 'Luxembourg'],
    LV: ['Letland', 'Latvia'],
    MA: ['Marokko', 'Morocco'],
    MT: ['Malta', 'Malta'],
    MX: ['Mexico', 'Mexico'],
    MY: ['Maleisië', 'Malaysia'],
    NL: ['Nederland', 'Netherlands'],
    NO: ['Noorwegen', 'Norway'],
    NZ: ['Nieuw-Zeeland', 'New Zealand'],
    PE: ['Peru', 'Peru'],
    PL: ['Polen', 'Poland'],
    PT: ['Portugal', 'Portugal'],
    RO: ['Roemenië', 'Romania'],
    RS: ['Servië', 'Serbia'],
    SE: ['Zweden', 'Sweden'],
    SG: ['Singapore', 'Singapore'],
    SI: ['Slovenië', 'Slovenia'],
    SK: ['Slowakije', 'Slovakia'],
    TH: ['Thailand', 'Thailand'],
    TR: ['Turkije', 'Türkiye'],
    TW: ['Taiwan', 'Taiwan'],
    US: ['Verenigde Staten', 'United States'],
    VN: ['Vietnam', 'Vietnam'],
    ZA: ['Zuid-Afrika', 'South Africa'],
};

export const COUNTRY_CODES = Object.keys(COUNTRY_NAMES);

export function countryName(code: string, locale: string): string {
    const names = COUNTRY_NAMES[code];
    return names ? names[locale.startsWith('en') ? 1 : 0] : code;
}

/** "2024 - 2025" → "24-25", as students write it. */
export const shortYear = (academicYear: string): string => {
    const match = /^(\d{2})(\d{2}) - \d{2}(\d{2})$/.exec(academicYear);
    return match ? `${match[2]}-${match[3]}` : academicYear;
};

/** The academic years someone can have been on exchange in, newest first: next year back to eight years ago. */
export function recentAcademicYears(today = new Date()): string[] {
    const current = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
    return Array.from({ length: 9 }, (_, index) => {
        const start = current + 1 - index;
        return `${start} - ${start + 1}`;
    });
}

/**
 * The application round someone can still take part in: the deadline is 15 February of the
 * academic year before the exchange. Returns that year (the deadline's) and which step of the
 * round is on now (0 = the info session in November, also before it; 1 = choosing and talking to
 * the coordinator; 2 = the application in the first half of February).
 */
export function applicationRound(today = new Date()): { deadlineYear: number; step: number } {
    const year = today.getFullYear();
    const deadlinePassed = today.getMonth() > 1 || (today.getMonth() === 1 && today.getDate() > 15);
    const deadlineYear = deadlinePassed ? year + 1 : year;
    const month = today.getMonth();
    const step = month === 10 ? 0 : month === 11 || month === 0 ? 1 : month === 1 ? 2 : 0;
    return { deadlineYear, step };
}

/** The faculty's pages, as linked from its own site (checked November 2026). */
export const LINKS = {
    procedure: 'https://eng.kuleuven.be/en/study/internationalisation/exchange-erasmus-outsideEU',
    application: 'https://set.kuleuven.be/exchange',
    preferred: 'https://eng.kuleuven.be/en/study/internationalisation/exchange-erasmus-outsideEU/erasmus_preferred_destinations',
    outsideEurope: 'https://eng.kuleuven.be/studeren/internationalisering/exchange-erasmus-outsideEU/universitiesoutsideeurope',
    contacts: 'https://eng.kuleuven.be/over-faculteit-ingenieurswetenschappen/contact/contactinformatie#autotoc-item-autotoc-15',
    discord: 'https://discord.com/invite/enR8SFZ9Vz',
    erasmusGrant: 'https://www.kuleuven.be/english/education/student/outgoing-mobility/erasmus-grants-programmecountries-uk',
    exchangeGrants: 'https://www.kuleuven.be/global/going-abroad/outgoingstudentmobility/exchange-grants',
    goGlobal: 'https://www.goglobal.kuleuven.cloud/',
    globalE3: 'https://eng.kuleuven.be/en/study/internationalisation/exchange-erasmus-outsideEU/ge3-global-engineering-education-exchange',
    doubleDegree: 'https://eng.kuleuven.be/en/study/internationalisation/dual_double_joint_degree',
    internationalisation: 'https://eng.kuleuven.be/studeren/internationalisering',
    athens: 'https://eng.kuleuven.be/studeren/internationalisering/athens',
    best: 'https://best.eu.org/courses/list.jsp',
    summerSchools: 'https://eng.kuleuven.be/studeren/internationalisering/summerschools',
    internships: 'https://eng.kuleuven.be/studeren/internationalisering/stage-masterproef',
    iaeste: 'https://iaeste.be/',
    humasol: 'https://www.humasol.be/',
    aiesec: 'https://aiesec.org/',
    goingSouth: 'https://eng.kuleuven.be/en/study/internationalisation/goingsouth',
    travelGrants: 'https://www.kuleuven.be/global/going-abroad/outgoingstudentmobility/travelgrants',
} as const;

export const EXCHANGE_EMAIL = 'exchange.eng@kuleuven.be';

const PROGRAM_KEY = 'burgieclan:exchange-program';

/** The programme the reader filtered on last, remembered in this browser. */
export function readSavedProgram(): string | null {
    try {
        const saved = window.localStorage.getItem(PROGRAM_KEY);
        return saved && (EXCHANGE_PROGRAMS as readonly string[]).includes(saved) ? saved : null;
    } catch {
        return null;
    }
}

export function saveProgram(program: string | null): void {
    try {
        if (program) window.localStorage.setItem(PROGRAM_KEY, program);
        else window.localStorage.removeItem(PROGRAM_KEY);
    } catch {
        // Private mode or blocked storage: the filter just is not remembered.
    }
}
