import { Response } from "express";

interface SseClient {
  res: Response;
  courseIds: Set<string>;
}

const clients = new Map<string, SseClient>();

export function addClient(
  id: string,
  courseIds: string[],
  res: Response
): void {
  clients.set(id, { res, courseIds: new Set(courseIds) });
}

export function removeClient(id: string): void {
  clients.delete(id);
}

export function emitToCourses(
  courseIds: string[],
  event: string,
  data: unknown
): void {
  const courseSet = new Set(courseIds);
  for (const [, client] of clients) {
    const overlaps = [...courseSet].some((id) => client.courseIds.has(id));
    if (overlaps) {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }
}
