export type NoteItem = {
  _id: string;
  content: string;
  createdAt: string;
  createdBy?: {
    username: string;
    role?: string;
  };
};