// Dictionary in the form dic['yyyy-mm-dd'] = value
interface DailyDictionary {
  [day: string]: number
}

// Statistics object
interface Stats {
  wordCount: DailyDictionary // All words for the graph
  pomodoros: DailyDictionary // All pomodoros ever completed
  avgMonth: number // Monthly average
  today: number // Today's word count
  sumMonth: number // Overall sum for the past month
}

interface StatsProvider {
  increaseWordCount: (words: number) => void
  increasePomodoros: () => void
  getData: () => Stats
}
