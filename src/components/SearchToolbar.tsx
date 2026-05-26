import { SearchBar } from './SearchBar'

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  resultCount: number
  totalCount: number
}

export function SearchToolbar({ value, onChange, resultCount, totalCount }: SearchToolbarProps) {
  return (
    <div className="search-toolbar">
      <SearchBar
        value={value}
        onChange={onChange}
        resultCount={resultCount}
        totalCount={totalCount}
      />
    </div>
  )
}
