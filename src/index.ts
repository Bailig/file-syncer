import { readFileSync } from "fs";
import { cp, echo, find, ls, mkdir, rm } from "shelljs";

const syncFrom = "";
const syncTo = "";

const getFilePaths = (dir: string) =>
  find(dir)
    .map((s) => s.match(/\./)?.input)
    .filter(Boolean) as string[];

const removeEmptyDirs = (rootPath: string) => {
  const emptyDirs = find(rootPath).filter((p) => ls(p)[0] === undefined);
  if (emptyDirs.length === 0) return;
  rm("-r", emptyDirs);
};

const removeFiles = (
  sourceRoot: string,
  destRoot: string,
  sourcePaths: string[],
  destPaths: string[]
) => {
  const shouldHavePaths = sourcePaths.map((p) =>
    p.replace(sourceRoot, destRoot)
  );
  const shouldBeRemoved = destPaths.filter((p) => !shouldHavePaths.includes(p));

  if (shouldBeRemoved.length === 0) return;
  const removeMessage = shouldBeRemoved.reduce(
    (text, path) => `${text}\n${path}`,
    "Removing:"
  );
  echo(removeMessage);
  rm(shouldBeRemoved);
  removeEmptyDirs(destRoot);
};

const addFiles = (
  sourceRoot: string,
  destRoot: string,
  sourcePaths: string[],
  destPaths: string[]
) => {
  const shouldBeAdded = sourcePaths.filter(
    (p) => !destPaths.includes(p.replace(sourceRoot, destRoot))
  );
  if (shouldBeAdded.length === 0) return;
  const addingMessage = shouldBeAdded.reduce(
    (text, path) => `${text}\n${path}`,
    "Adding:"
  );
  echo(addingMessage);
  shouldBeAdded.forEach((source, index) => {
    echo(`${index + 1}. ${source}`);
    const dest = source.replace(sourceRoot, destRoot);
    mkdir("-p", dest.substr(0, dest.lastIndexOf("/")));
    cp(source, dest);
  });
};

const updateFiles = (
  sourceRoot: string,
  destRoot: string,
  sourcePaths: string[]
) => {
  const needToBeUpdated = sourcePaths.filter((source) => {
    const dest = source.replace(sourceRoot, destRoot);
    const sourceBuff = readFileSync(source);
    const destBuff = readFileSync(dest);
    return !sourceBuff.equals(destBuff);
  });

  if (needToBeUpdated.length === 0) return;
  echo("Updating:");
  needToBeUpdated.forEach((source, index) => {
    const dest = source.replace(sourceRoot, destRoot);
    echo(`${index + 1}. ${dest}`);
    cp(source, dest);
  });
};

const sync = (syncFrom: string, syncTo: string) => {
  if (
    syncFrom === "/" ||
    syncFrom === "~" ||
    syncFrom === "" ||
    syncTo === "/" ||
    syncTo === "~" ||
    syncTo === ""
  ) {
    echo("syncFrom and syncTo is required");
    return;
  }

  echo(`Start syncing from:\n${syncFrom} to\n${syncTo}`);
  const syncFromPaths = getFilePaths(syncFrom);
  const syncToPaths = getFilePaths(syncTo);

  removeFiles(syncFrom, syncTo, syncFromPaths, syncToPaths);
  addFiles(syncFrom, syncTo, syncFromPaths, syncToPaths);
  updateFiles(syncFrom, syncTo, syncFromPaths);
};

sync(syncFrom, syncTo);
