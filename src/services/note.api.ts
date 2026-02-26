import { NoteItem } from "@/types/note";
import { requestNode } from "./http.node";

export function getNotes(idPhieuKham: string) {
  return requestNode<NoteItem[]>(`/api/encounters/${idPhieuKham}/notes`);
}

export function createNote(idPhieuKham: string, content: string) {
  return requestNode<NoteItem[]>(`/api/encounters/${idPhieuKham}/notes`, {
    method: "POST",
    body: { content },
  });
}