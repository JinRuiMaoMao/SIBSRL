import type { BilingualText } from './route'

export type ComplaintFilter = 'all' | 'driving' | 'alight' | 'service'

export interface PassengerComplaint {
  id: string
  number: number
  category: 'driving' | 'alight'
  title: BilingualText
  detail: BilingualText
  audioUrl: string
}
