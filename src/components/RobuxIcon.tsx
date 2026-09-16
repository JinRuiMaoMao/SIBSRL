import { useId } from 'react'

const VIEWBOX_WIDTH = 24
const VIEWBOX_HEIGHT = 26.1

const ROBUX_PATH =
  'M21.4,4.62A5.2,5.2,0,0,1,24,9.12V17a5.19,5.19,0,0,1-2.6,4.5l-6.8,3.93a5.19,5.19,0,0,1-5.2,0L2.6,21.48A5.19,5.19,0,0,1,0,17V9.12a5.2,5.2,0,0,1,2.6-4.5L9.4.7a5.19,5.19,0,0,1,5.2,0ZM10.31,2.48,3.69,6.31A3.35,3.35,0,0,0,2,9.23v7.65A3.36,3.36,0,0,0,3.69,19.8l6.62,3.83a3.4,3.4,0,0,0,3.38,0l6.62-3.83A3.36,3.36,0,0,0,22,16.88V9.23a3.35,3.35,0,0,0-1.69-2.92L13.69,2.48a3.4,3.4,0,0,0-3.38,0Zm3.08,2.14,5.22,3A2.78,2.78,0,0,1,20,10v6a2.76,2.76,0,0,1-1.39,2.4l-5.22,3a2.76,2.76,0,0,1-2.78,0l-5.22-3A2.76,2.76,0,0,1,4,16.07V10A2.78,2.78,0,0,1,5.39,7.63l5.22-3a2.76,2.76,0,0,1,2.78,0ZM9,16.05h6v-6H9Z'

export function RobuxIcon({
  className,
  size = 16,
}: {
  className?: string
  size?: number
}) {
  const gradientId = useId().replace(/:/g, '')
  const height = Math.round(size * (VIEWBOX_HEIGHT / VIEWBOX_WIDTH))

  return (
    <svg
      className={`robux-icon${className ? ` ${className}` : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      width={size}
      height={height}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="-21.63"
          y1="63.75"
          x2="-21.63"
          y2="62.78"
          gradientTransform="matrix(24, 0, 0, -26.1, 531, 1665.03)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#eedfa2" />
          <stop offset="0.59" stopColor="#a9935a" />
          <stop offset="1" stopColor="#fee3a5" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d={ROBUX_PATH} />
    </svg>
  )
}
