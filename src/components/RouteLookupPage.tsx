import { useEffect, useState } from 'react'
import { NumberingGuide } from './NumberingGuide'
import { RouteCard } from './RouteCard'
import { RouteDetail } from './RouteDetail'
import { RouteFilters } from './RouteFilters'
import { SearchToolbar } from './SearchToolbar'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRouteSearch } from '../hooks/useRouteSearch'
import { useLocale } from '../i18n/LocaleContext'

export function RouteLookupPage() {
  const { t } = useLocale()
  const isWideLayout = useMediaQuery('(min-width: 901px)')
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const {
    filters,
    updateFilter,
    filteredRoutes,
    selectedRoute,
    getDirectionIndex,
    setDirectionIndex,
    selectRoute,
    clearSelection,
    zones,
    operators,
    types,
    totalCount,
  } = useRouteSearch()

  useEffect(() => {
    if (selectedRoute) {
      setDetailSheetOpen(true)
    } else {
      setDetailSheetOpen(false)
    }
  }, [selectedRoute?.id])

  useEffect(() => {
    if (!selectedRoute || isWideLayout) return
    const prev = document.body.style.overflow
    document.body.style.overflow = detailSheetOpen ? 'hidden' : prev
    return () => {
      document.body.style.overflow = prev
    }
  }, [selectedRoute, isWideLayout, detailSheetOpen])

  const handleSelectRoute = (id: string) => {
    selectRoute(id)
    if (!isWideLayout) setDetailSheetOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailSheetOpen(false)
    clearSelection()
  }

  const detailProps = selectedRoute
    ? {
        route: selectedRoute,
        directionIndex: getDirectionIndex(selectedRoute),
        onDirectionChange: (index: number) => setDirectionIndex(selectedRoute.id, index),
        onClose: handleCloseDetail,
      }
    : null

  return (
    <>
      <SearchToolbar
        value={filters.query}
        onChange={(q) => updateFilter('query', q)}
        resultCount={filteredRoutes.length}
        totalCount={totalCount}
      />

      <RouteFilters
        zone={filters.zone}
        operator={filters.operator}
        type={filters.type}
        zones={zones}
        operators={operators}
        types={types}
        onZoneChange={(z) => updateFilter('zone', z)}
        onOperatorChange={(op) => updateFilter('operator', op)}
        onTypeChange={(item) => updateFilter('type', item)}
      />

      <div className="content-layout">
        <section className="route-list-section" aria-label={t('routeList')}>
          {filteredRoutes.length === 0 ? (
            <p className="empty-state">{t('emptyState')}</p>
          ) : (
            <div className="route-grid">
              {filteredRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRoute?.id === route.id}
                  directionIndex={getDirectionIndex(route)}
                  onDirectionChange={(index) => setDirectionIndex(route.id, index)}
                  onSelect={() => handleSelectRoute(route.id)}
                />
              ))}
            </div>
          )}
        </section>

        {isWideLayout &&
          (detailProps ? (
            <RouteDetail {...detailProps} />
          ) : (
            <aside className="route-detail placeholder">
              <p>{t('detailPlaceholder')}</p>
              <p className="placeholder-hint">
                {t('detailPlaceholderHint', { total: totalCount })}
              </p>
            </aside>
          ))}
      </div>

      {!isWideLayout && detailProps && (
        <>
          <button
            type="button"
            className={`route-detail-backdrop ${detailSheetOpen ? 'is-visible' : ''}`}
            aria-label={t('closeDetail')}
            onClick={handleCloseDetail}
          />
          <div
            className={`route-detail-sheet ${detailSheetOpen ? 'is-open' : ''}`}
            role="dialog"
            aria-modal="true"
          >
            <RouteDetail {...detailProps} />
          </div>
        </>
      )}

      <NumberingGuide />
    </>
  )
}
