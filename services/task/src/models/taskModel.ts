export interface Task {
  task_id: string;
  user_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  start_time: string;
  is_active: boolean;
  created_at: Date;
}
