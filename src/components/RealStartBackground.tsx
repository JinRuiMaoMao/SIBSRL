import { resolveSiteAssetUrl } from '../utils/appLayoutMode'

export function RealStartBackground() {
  const mapBackgroundUrl = resolveSiteAssetUrl('maps/SIMapGerenal.png')

  return (
    <div className="real-start-bg" aria-hidden="true">
      <img className="real-start-bg-map" src={mapBackgroundUrl} alt="" decoding="async" />
      <div className="real-start-bg-overlay" />
    </div>
  )
}
