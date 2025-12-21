export interface taskDTO {
  title: string;
  description?: string;

  duration_minutes?: number | null;

  // kullanıcı göndermezse backend now() veriyor ama yine de opsiyonel
  start_time?: string;

  // kullanıcı verebilir ya da duration+start_time ile hesaplanır
  due_date?: string;
}
