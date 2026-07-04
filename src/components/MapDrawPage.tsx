import '../styles/mapDrawEditor.css'
import { IslandMapDrawEditor } from './IslandMapDrawEditor'

/** 独立路线图编辑器页（map-draw.html），布局参考 Downloads/index。 */
export function MapDrawPage() {
  return (
    <div className="route-editor-page-root">
      <IslandMapDrawEditor />
    </div>
  )
}
