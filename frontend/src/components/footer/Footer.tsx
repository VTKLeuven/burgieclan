'use client'

import styles from "./styles.module.css";
import Image from 'next/image'
import Link from 'next/link'
import { getCurrentYear } from "@/utils/date";
import { useTranslation } from "react-i18next";
import { SquareArrowOutUpRight } from "lucide-react";

type IconProps = React.SVGProps<SVGSVGElement>;

const navigation = [
    {
        name: 'Facebook',
        href: 'https://facebook.com/VTKLeuven',
        icon: (props: IconProps) => (
            <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
                <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                />
            </svg>
        ),
    },
    {
        name: 'Instagram',
        href: 'https://www.instagram.com/vtkleuven/',
        icon: (props: IconProps) => (
            <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
                <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                />
            </svg>
        ),
    },
    {
        name: 'YouTube',
        href: 'https://www.youtube.com/user/VTKLeuven',
        icon: (props: IconProps) => (
            <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
                <path
                    fillRule="evenodd"
                    d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
                    clipRule="evenodd"
                />
            </svg>
        ),
    },
    {
        name: 'Tiktok',
        href: 'https://www.tiktok.com/@vtkleuven',
        icon: (props: IconProps) => (
            <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
                <path
                    fillRule="evenodd"
                    d="M12.75 2.75h2.172a5.23 5.23 0 0 0 1.061 2.727 5.232 5.232 0 0 0 2.727 1.06v2.172a7.303 7.303 0 0 1-4.07-1.262v6.998a5.656 5.656 0 1 1-5.656-5.657h.364v2.172a3.485 3.485 0 1 0 3.485 3.485V2.75Z"
                    clipRule="evenodd"
                />
            </svg>
        ),
    },
]

export default function Footer() {
    const currentYear = getCurrentYear();
    const { t } = useTranslation();

    return (
        // Dark navy band on every page: the closing bookend to the navy header,
        // so the site opens and closes dark. Mirrors `.vtk-site-footer`.
        <footer aria-labelledby="footer-heading" className="mt-auto border-t border-white/10 bg-vtk-navy text-vtk-paper antialiased">
            <h2 id="footer-heading" className="sr-only">Footer</h2>
            <div className="mx-auto max-w-(--max) px-5 pb-8 pt-12 sm:px-9">
                <div className="grid gap-9 md:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))]">

                    {/* Brand */}
                    <div>
                        <Image
                            src="/images/logos/vtk-logo-white.png"
                            alt=""
                            width={140}
                            height={38}
                            className="mb-4 h-[34px] w-auto max-w-[150px] object-contain object-left"
                        />
                        <p className="max-w-[24ch] whitespace-pre-line text-[22px] font-bold leading-[1.12] tracking-tight text-vtk-paper">
                            {t('footer.tagline')}
                        </p>
                        <p className="mt-3.5 max-w-[36ch] text-[13px] leading-relaxed text-vtk-on-dark-muted">
                            Kasteelpark Arenberg 6{'\n'}3001 Heverlee, België
                        </p>

                        <div className="mt-5 flex space-x-4">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="text-vtk-paper/70 transition-colors hover:text-white"
                                >
                                    <span className="sr-only">{item.name}</span>
                                    <item.icon aria-hidden="true" className="h-5 w-5" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    <div>
                        <h3 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-vtk-on-dark-muted">
                            {t('footer.navigate')}
                        </h3>
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            <li><Link href="/courses" className={styles.footerNavLink}>{t('courses')}</Link></li>
                            <li><Link href="/account" className={styles.footerNavLink}>{t('account.account')}</Link></li>
                            <li><Link href="/faq" className={styles.footerNavLink}>{t('FAQ')}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-vtk-on-dark-muted">
                            {t('footer.support')}
                        </h3>
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            <li>
                                <Link href="/support" prefetch={true} className={styles.footerNavLink}>
                                    {t('report_issue')}
                                </Link>
                            </li>
                            <li>
                                <Link href="https://github.com/VTKLeuven/burgieclan" className={styles.footerNavLink}>
                                    {t('contribute_github')}
                                    <SquareArrowOutUpRight className="ml-1 inline-block h-3 w-3 align-baseline" aria-hidden="true" />
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-vtk-on-dark-muted">
                            {t('footer.community')}
                        </h3>
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            <li><Link href="https://vtk.be" className={styles.footerNavLink}>vtk.be</Link></li>
                            <li><Link href="https://vtk.be/account/" className={styles.footerNavLink}>{t('header.my_vtk')}</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-9 flex flex-col justify-between gap-4 border-t border-white/12 pt-4.5 text-xs text-vtk-on-dark-muted sm:flex-row">
                    <p className="m-0">&copy; {currentYear} Vlaamse Technische Kring vzw</p>
                </div>
            </div>
        </footer>
    )
}
