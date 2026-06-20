// components/user-menu.tsx

'use client';



import { ChevronDownIcon, UserCircleIcon } from '@heroicons/react/24/outline';

import Image from 'next/image';

import { Link } from '@/i18n/navigation';

import { signOut } from 'next-auth/react';

import {

  useCallback,

  useEffect,

  useId,

  useRef,

  useState,

  type ReactElement,

} from 'react';



export type UserMenuProps = {

  name: string | null;

  email: string;

  image: string | null;

  isAdmin?: boolean;

};



const CLOSE_DELAY_MS = 200;



export default function UserMenu({ name, email, image, isAdmin = false }: UserMenuProps): ReactElement {

  const [open, setOpen] = useState<boolean>(false);

  const [signingOut, setSigningOut] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panelId = useId();



  const displayName = name ?? email.split('@')[0] ?? 'Tài khoản';

  const initial = (displayName.trim().charAt(0) || 'P').toUpperCase();



  const cancelClose = useCallback((): void => {

    if (closeTimerRef.current) {

      clearTimeout(closeTimerRef.current);

      closeTimerRef.current = null;

    }

  }, []);



  const close = useCallback((): void => {

    cancelClose();

    setOpen(false);

  }, [cancelClose]);



  const openMenu = useCallback((): void => {

    cancelClose();

    setOpen(true);

  }, [cancelClose]);



  const scheduleClose = useCallback((): void => {

    cancelClose();

    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);

  }, [cancelClose]);



  useEffect(() => {

    const handleClick = (event: MouseEvent): void => {

      const node = event.target;

      if (!(node instanceof Node)) return;

      if (containerRef.current && !containerRef.current.contains(node)) {

        close();

      }

    };



    const handleKey = (event: KeyboardEvent): void => {

      if (event.key === 'Escape') close();

    };



    document.addEventListener('mousedown', handleClick);

    document.addEventListener('keydown', handleKey);

    return () => {

      document.removeEventListener('mousedown', handleClick);

      document.removeEventListener('keydown', handleKey);

    };

  }, [close]);



  useEffect(() => () => cancelClose(), [cancelClose]);



  async function handleSignOut(): Promise<void> {

    if (signingOut) return;

    setSigningOut(true);

    try {

      await signOut({ callbackUrl: '/' });

    } finally {

      setSigningOut(false);

      close();

    }

  }



  return (

    <div

      ref={containerRef}

      className="relative"

      onMouseEnter={openMenu}

      onMouseLeave={scheduleClose}

      onFocus={openMenu}

      onBlur={(event) => {

        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {

          scheduleClose();

        }

      }}

    >

      <button

        type="button"

        aria-haspopup="menu"

        aria-expanded={open}

        aria-controls={panelId}

        onClick={() => setOpen((value) => !value)}

        className="flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-2 pr-3 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"

      >

        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">

          {image ? (

            <Image

              src={image}

              alt={displayName}

              fill

              sizes="32px"

              className="object-cover"

              unoptimized

            />

          ) : (

            <span className="text-sm font-semibold leading-none">{initial}</span>

          )}

        </span>

        <span className="hidden max-w-[8rem] truncate sm:inline">{displayName}</span>

        <ChevronDownIcon

          className={`hidden h-4 w-4 text-neutral-500 transition-transform sm:block ${

            open ? 'rotate-180' : 'rotate-0'

          }`}

          aria-hidden="true"

        />

      </button>



      <div

        id={panelId}

        data-open={open ? 'true' : 'false'}

        aria-hidden={!open}

        className="nav-dropdown-panel absolute right-0 top-full z-50 w-64 pt-2"

      >

        <div

          role="menu"

          aria-label="Menu tài khoản"

          className="origin-top-right overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-white/10"

        >

          <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">

            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">

              Xin chào, {displayName}

            </p>

            <p className="mt-0.5 truncate text-xs text-neutral-400 dark:text-neutral-500">

              {email}

            </p>

          </div>



          <ul className="py-1 text-sm" role="none">

            {isAdmin ? (

              <li role="none">

                <a

                  href="/admin"

                  role="menuitem"

                  tabIndex={open ? 0 : -1}

                  onClick={close}

                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:hover:text-white"

                >

                  <AdminIcon />

                  Quản trị

                </a>

              </li>

            ) : null}

            <li role="none">

              <Link

                href="/profile"

                role="menuitem"

                prefetch

                tabIndex={open ? 0 : -1}

                onClick={close}

                className="flex items-center gap-2 px-4 py-2 text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:hover:text-white"

              >

                <UserCircleIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" />

                Tài khoản của tôi

              </Link>

            </li>

            <li role="none">

              <button

                type="button"

                role="menuitem"

                tabIndex={open ? 0 : -1}

                onClick={handleSignOut}

                disabled={signingOut}

                className="flex w-full items-center gap-2 px-4 py-2 text-left text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:cursor-wait disabled:opacity-60 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:hover:text-white"

              >

                <LogoutIcon />

                {signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}

              </button>

            </li>

          </ul>

        </div>

      </div>

    </div>

  );

}



function AdminIcon(): ReactElement {

  return (

    <svg

      xmlns="http://www.w3.org/2000/svg"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth={1.7}

      className="h-4 w-4 text-neutral-400"

      aria-hidden="true"

    >

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.431l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a7.723 7.723 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.827a1.125 1.125 0 0 1-.26-1.431l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"

      />

      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />

    </svg>

  );

}



function LogoutIcon(): ReactElement {

  return (

    <svg

      xmlns="http://www.w3.org/2000/svg"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth={1.7}

      className="h-4 w-4 text-neutral-400"

      aria-hidden="true"

    >

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 12H9m9 0-3-3m3 3-3 3"

      />

    </svg>

  );

}

