export interface taskDTO {
  title: string;
  description?: string;
  durationMinutes?: number | null;
  startDate?: string | null; // ! ekledim ama hiç kullanmıyorum kodda
  endDate?: string | null; // ! ekledim ama hiç kullanmıyorum kodda
  // kullanıcı göndermezse backend now() veriyor ama yine de opsiyonel
  startTime?: string | Date | null;
  // kullanıcı verebilir ya da duration+start_time ile hesaplanır
  endTime?: string | Date | null;
  locationTrigger?: LocationTrigger;
}

export type GeoEvent = "enter" | "exit";

export interface LocationTrigger {
  enabled: boolean;
  name?: string; // "Office"
  latitude: number;
  longitude: number;
  event: GeoEvent;
}