import type { AppTab } from '../types/appTab'

export function AppTabIcon({ tab }: { tab: AppTab }) {
  switch (tab) {
    case 'routes':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13ZM6.5 5a.5.5 0 0 0-.5.5v2.2l5.2 2.6a1 1 0 0 0 .9 0L17.3 7.7V5.5a.5.5 0 0 0-.5-.5h-10ZM18 10.3l-5.7 2.85a2 2 0 0 1-1.8 0L6 10.3V18.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V10.3Z"
          />
        </svg>
      )
    case 'broadcast':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M12 3a9 9 0 0 1 7.74 13.6l1.43 1.43a1 1 0 1 1-1.42 1.42l-1.5-1.5A9 9 0 1 1 12 3Zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-1 3.5a1 1 0 0 1 1 1V14a1 1 0 1 1-2 0V9.5a1 1 0 0 1 1-1Zm2 0a3 3 0 0 1 3 3V14a3 3 0 1 1-6 0v-1.5a1 1 0 1 1 2 0V14a1 1 0 1 0 2 0V9.5a1 1 0 0 1 1-1Z"
          />
        </svg>
      )
    case 'music':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M14 3.5a1 1 0 0 1 1.45-.9l5 2.5A1 1 0 0 1 20 6v9.17a3.5 3.5 0 1 1-2-3.16V7.3l-3-1.5V15.5a3.5 3.5 0 1 1-2-3.16V3.5Z"
          />
        </svg>
      )
    case 'complaints':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.4L5.7 19.3A1 1 0 0 1 4 18.5V5Zm2 0v12.59l2.3-2.3A1 1 0 0 1 9 15h9V5H6Z"
          />
        </svg>
      )
    case 'updates':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            fill="currentColor"
            d="M7 3a1 1 0 0 1 .8.4l1.7 2.27A6 6 0 0 1 12 5c3.31 0 6 2.69 6 6 0 1.1-.3 2.13-.82 3.02l1.66 2.22A1 1 0 0 1 18.7 18H15v3a1 1 0 1 1-2 0v-3H6a1 1 0 0 1-.8-1.6l1.7-2.27A6 6 0 0 1 6 11c0-1.1.3-2.13.82-3.02L5.16 5.76A1 1 0 0 1 6 3h1Zm1.24 4.18A4 4 0 0 0 8 11c0 .69.17 1.34.47 1.91L7.24 15H16.8l-1.23-2.09c.3-.57.47-1.22.47-1.91a4 4 0 0 0-4-4c-.69 0-1.34.17-1.91.47L8.24 7.18Z"
          />
        </svg>
      )
    default:
      return null
  }
}
