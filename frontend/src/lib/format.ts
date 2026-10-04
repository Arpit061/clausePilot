const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`
}

export function formatScore(value: number) {
  return value.toFixed(2)
}
