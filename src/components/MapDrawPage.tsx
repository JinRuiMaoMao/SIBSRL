import { useState } from 'react'
import '../styles/mapDrawEditor.css'
import { IslandMapDrawEditor } from './IslandMapDrawEditor'
import { MapDrawBootSplash } from './MapDrawBootSplash'

/** 独立路线图编辑器页（map-draw.html），布局参考 Downloads/index。 */
export function MapDrawPage() {
  const [bootDone, setBootDone] = useState(false)

  return (
    <>
      {!bootDone ? <MapDrawBootSplash onDone={() => setBootDone(true)} /> : null}
      <div className={bootDone ? 'route-editor-page-root' : 'route-editor-page-root route-editor-page-root--booting'}>
        <IslandMapDrawEditor ready={bootDone} />
      </div>
    </>
  )
}
