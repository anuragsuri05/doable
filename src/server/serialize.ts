import "server-only";
import type { MessageRow, ProjectRow } from "./db";
import type { ChatMessage, Mode, Provider, ProjectSummary } from "@/lib/types";

export function toChatMessage(r: MessageRow): ChatMessage {
  const attachments = JSON.parse(r.attachments_json) as { name: string; mediaType: string; uploadId?: string }[];
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    parts: JSON.parse(r.parts_json),
    attachments: attachments.map((a) => ({ name: a.name, mediaType: a.mediaType, url: a.uploadId ? `/api/uploads/${a.uploadId}` : undefined })),
    mode: r.mode as Mode,
    provider: r.provider as Provider | null,
    model: r.model,
    status: r.status,
    error: r.error,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    costUsd: r.cost_usd,
    commitSha: r.commit_sha,
    createdAt: r.created_at,
  };
}

export function toProjectSummary(p: ProjectRow): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    slug: p.slug,
    visibility: p.visibility,
    starred: !!p.starred,
    publishedAt: p.published_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
