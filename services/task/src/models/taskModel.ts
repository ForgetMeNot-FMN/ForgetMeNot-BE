export interface Task {
  task_id: string;
  user_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  start_time: string;
  end_time?: Date | null; // duration eklenirse otomatik gelicek
  is_active: boolean;
  is_completed: boolean;
  completed_at?: Date | null; 
  created_at: Date;
  updated_at?: Date;
}
