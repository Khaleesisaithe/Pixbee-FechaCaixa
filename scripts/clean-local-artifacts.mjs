import { rm } from "node:fs/promises";

const generatedPublicArtifacts = ["client/public/__manus__"];

await Promise.all(
  generatedPublicArtifacts.map(path => rm(path, { recursive: true, force: true }))
);
