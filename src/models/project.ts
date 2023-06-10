import fb from "../integrations/firebase";
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@parkour-ops/airetable-contract";
import { MarkOptional } from "ts-essentials";
import { v4 as uuidv4 } from "uuid";
import { undescribed, untitled } from "../generic";
import { Buildable } from "ts-essentials";

export async function readProject(
  userId: string,
  projectId: string
): Promise<Project | undefined> {
  const _project = await fb.db(`users/${userId}/projects/${projectId}`).get();
  if (!_project.exists) return undefined;
  return _project.val() as Project;
}

export async function createProject(
  userId: string,
  project: CreateProjectRequest
): Promise<Project> {
  return new Promise<Project>(async (res, rej) => {
    const projectId = uuidv4();
    await fb.db(`users/${userId}/projects/${projectId}`).set(
      {
        id: projectId,
        name: project.name ?? untitled,
        description: project.description ?? undescribed,
        airtable: project.airtable,
        created: Date.now(),
      },
      async (err) => {
        if (err) {
          rej(err);
        } else {
          const proj = await readProject(userId, projectId);
          if (!proj) {
            rej(new Error("Created project could not be read!"));
          } else {
            res(proj);
          }
        }
      }
    );
  });
}

export async function updateProject(
  userId: string,
  project: UpdateProjectRequest
): Promise<Project> {
  return new Promise<Project>(async (res, rej) => {
    // reject if project doesn't exist
    const projectToUpdate = await readProject(userId, project.id);
    if (!projectToUpdate) rej(new Error("Project to update does not exist!"));
    // update the project
    let err;
    await fb
      .db(`users/${userId}/projects/${project.id}`)
      .update(project, (_err) => {
        err = _err;
      });
    // reject if error
    if (err) rej(err);
    // read the updated project and return
    const updatedProj = await readProject(userId, project.id);
    if (!updatedProj) {
      rej(new Error("Updated project could not be read!"));
    } else {
      res(updatedProj);
    }
  });
}

export async function deleteProject(
  userId: string,
  projectId: string
): Promise<Project> {
  return new Promise<Project>(async (res, rej) => {
    // reject if project doesn't exist
    const projectToDelete = await readProject(userId, projectId);
    if (!projectToDelete) rej(new Error("Project to update does not exist!"));
    //
    else {
      await fb.db(`users/${userId}/projects/${projectId}`).remove((err) => {
        if (err) {
          rej(err);
        } else {
          res(projectToDelete);
        }
      });
    }
  });
}
