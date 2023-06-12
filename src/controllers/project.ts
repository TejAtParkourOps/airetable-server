import {
  SocketIoRouteHandler,
  extractErrorDescription,
} from "../server-framework";
import { DecodedIdToken } from "../integrations/firebase";
import {
  CreateProjectRequest,
  CreateProjectResponse,
  DeleteProjectRequest,
  DeleteProjectResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
  makeSuccessResponse,
} from "@parkour-ops/airetable-contract";
import { makeErrorResponse } from "@parkour-ops/airetable-contract";
import {
  createProject,
  deleteProject,
  readProject,
  updateProject,
} from "../models/project";

export const createProjectHandler: SocketIoRouteHandler<
  DecodedIdToken,
  CreateProjectRequest,
  CreateProjectResponse
> = async (server, socket, tkn, data, callback) => {
  try {
    const project = await createProject(tkn.uid, data);
    callback(makeSuccessResponse(project, 201, "Project created."));
  } catch (err) {
    callback(
      makeErrorResponse(
        500,
        `Failed to create project: ${extractErrorDescription(err)}`
      )
    );
  }
};

export const updateProjectHandler: SocketIoRouteHandler<
  DecodedIdToken,
  UpdateProjectRequest,
  UpdateProjectResponse
> = async (server, socket, tkn, data, callback) => {
  try {
    const project = await updateProject(tkn.uid, data);
    callback(makeSuccessResponse(project, 200, "Project updated."));
  } catch (err) {
    callback(makeErrorResponse(500, "Failed to update project."));
  }
};

export const deleteProjectHandler: SocketIoRouteHandler<
  DecodedIdToken,
  DeleteProjectRequest,
  DeleteProjectResponse
> = async (server, socket, tkn, data, callback) => {
  try {
    const project = await deleteProject(tkn.uid, data.id);
    callback(makeSuccessResponse(project, 200, "Project deleted."));
  } catch (err) {
    callback(makeErrorResponse(500, "Failed to delete project."));
  }
};
