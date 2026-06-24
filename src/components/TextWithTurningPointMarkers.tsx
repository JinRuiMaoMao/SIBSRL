import { Fragment } from 'react'
import { textContainsTurningPointMarker } from '../utils/stopTurningPoint'
import { StopTurningPointBadge } from './StopTurningPointBadge'

const TURNING_POINT_MARKER = '转折点'

interface TextWithTurningPointMarkersProps {
  text: string
}

/** 将文案中的「转折点」三字替换为醒目框标记（不属于站名本身） */
export function TextWithTurningPointMarkers({ text }: TextWithTurningPointMarkersProps) {
  if (!textContainsTurningPointMarker(text)) return text

  const parts = text.split(TURNING_POINT_MARKER)
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 ? <StopTurningPointBadge /> : null}
        </Fragment>
      ))}
    </>
  )
}
