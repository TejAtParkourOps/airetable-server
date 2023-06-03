import fb from "../integrations/firebase";
import { Project } from "@parkour-ops/airetable-contract";
import { DeepReadonly } from "ts-essentials";

export async function readProject(userId: string, projectId: string) {
  const _project = await fb.db(`users/${userId}/projects/${projectId}`).get();
  if (!_project.exists) return undefined;
  return _project.val() as DeepReadonly<Project>;
}
