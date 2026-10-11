export type JobStatus =
  | 'applied'
  | 'interview'
  | 'offer'
  | 'wishlist'
  | 'rejected'

export type Job = {
  id: string
  company: string
  position: string
  location: string
  status: JobStatus
  appliedDate: string
  jobUrl: string
  skills: string[]
  salary: string
  description: string

  deletedAt?: string
}