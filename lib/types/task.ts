export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface TaskRecord {
  id: number;
  title: string;
  agent: string;
  status: string;
  result: string | null;
  createdAt: Date;
}
