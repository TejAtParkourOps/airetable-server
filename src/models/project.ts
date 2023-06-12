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
import { AirtableBase, getListOfBases } from "../integrations/airtable";
import { extractErrorDescription } from "../server-framework";

export async function readProject(
  userId: string,
  projectId: string
): Promise<Project | undefined> {
  if (!projectId) {
    throw Error("Project ID is required.");
  }
  const dbAddress = `users/${userId}/projects/${projectId}`;
  console.debug(`Reading project at address: ${dbAddress}`);
  const _project = await fb.db(dbAddress).get();
  if (!_project.exists) return undefined;
  return _project.val() as Project;
}

export async function createProject(
  userId: string,
  project: CreateProjectRequest
): Promise<Project> {
  if (!project?.name) {
    throw "project name is required.";
  }
  if (!project?.airtable?.personalAccessToken || !project?.airtable?.baseId) {
    throw "Airtable credentials are required.";
  }
  // test Airtable credentials
  let bases;
  try {
    bases = (await getListOfBases(project.airtable.personalAccessToken)).bases;
  } catch (err) {
    throw "could not probe Airtable base; check personal access token is valid.";
  }
  if (!bases.find((base) => base.id === project.airtable.baseId))
    throw "the requested Airtable base does not exist, or the personal access token does not have sufficient permission.";
  // generate id and compute address
  const projectId = uuidv4();
  const dbAddress = `users/${userId}/projects/${projectId}`;
  // set
  // console.debug(`Creating project at address: ${dbAddress}`, project);
  await fb.db(dbAddress).set({
    id: projectId,
    name: project.name ?? untitled,
    description: project.description ?? undescribed,
    airtable: project.airtable,
    created: Date.now(),
  });
  // read what was set
  const proj = await readProject(userId, projectId);
  if (!proj) {
    throw "could not create project!";
  }
  // return
  return proj;
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
