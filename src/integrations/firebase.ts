import admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import configManager from "../configuration-manager";

const firebaseConfig: admin.AppOptions = {
  credential: admin.credential.cert(
    JSON.parse(
      Buffer.from(
        configManager.configs.firebase.serviceAccountCertBase64,
        "base64"
      ).toString()
    )
  ),
  projectId: configManager.configs.firebase.projectId,
  databaseURL: configManager.configs.firebase.databaseURL,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

async function verifyAuthToken(authToken: string): Promise<DecodedIdToken> {
  return auth.verifyIdToken(authToken);
}

export { DecodedIdToken } from "firebase-admin/auth";
export default {
  db: (path: string) => db.ref(path),
  verifyAuthToken,
};
