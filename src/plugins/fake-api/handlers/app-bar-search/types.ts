export interface SearchItem {
  url: object
  icon: string
  title: string
  subtitle?: string
  action?: string
  subject?: string
}

export interface SearchResults {
  title: string
  category: string
  children: SearchItem[]
}
