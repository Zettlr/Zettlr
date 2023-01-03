// Dictionary in the form dic['yyyy-mm-dd'] = value
export type DailyDictionary = Record<string, number>

// Statistics object
export interface Stats {
  wordCount: DailyDictionary // All words for the graph
  pomodoros: DailyDictionary // All pomodoros ever completed
  avgMonth: number // Monthly average
  today: number // Today's word count
  sumMonth: number // Overall sum for the past month
}
