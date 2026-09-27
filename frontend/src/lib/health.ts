import { apiClient } from '@/lib/api-client'

export interface HealthStatus {
  status: string
  service: string
}

export function getHealth() {
  return apiClient.get<HealthStatus>('/health')
}
