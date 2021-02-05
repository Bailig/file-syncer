import { readFile, stat, Stats } from "fs";
import { cp, echo, find, ls, mkdir, rm } from "shelljs";

type CheckUpdateBy = "modifiedDate" | "fileChange";

const syncFrom = "";
const syncTo = "";
const checkUpdateBy: CheckUpdateBy = "modifiedDate";

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
  echo("Adding:");
  shouldBeAdded.forEach((source) => {
    echo(source);
    const dest = source.replace(sourceRoot, destRoot);
    mkdir("-p", dest.substr(0, dest.lastIndexOf("/")));
    cp(source, dest);
  });
};

const promisify = <D>(fun: any) => (...args: any[]) =>
  new Promise<D>((resolve, reject) => {
    fun(...args, (error: Error, data: D) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });

const statAsync = promisify<Stats>(stat);
const readFileAsync = promisify<Buffer>(readFile);

const shouldUpdate = async (
  source: string,
  dest: string,
  checkUpdateBy: CheckUpdateBy
) => {
  if (checkUpdateBy === "fileChange") {
    const [sourceBuff, destBuff] = await Promise.all([
      readFileAsync(source),
      readFileAsync(dest),
    ]);
    return !sourceBuff.equals(destBuff);
  } else {
    const [sourceStat, destStat] = await Promise.all([
      statAsync(source),
      statAsync(dest),
    ]);
    return sourceStat.mtimeMs > destStat.mtimeMs;
  }
};

const updateFiles = (
  sourceRoot: string,
  destRoot: string,
  sourcePaths: string[],
  checkUpdateBy: CheckUpdateBy
) => {
  let logged = false;
  const promises = sourcePaths.map(async (source) => {
    const dest = source.replace(sourceRoot, destRoot);
    if (
      find(dest).code !== 0 ||
      !(await shouldUpdate(source, dest, checkUpdateBy))
    )
      return;

    if (!logged) {
      echo("Updating:");
      logged = true;
    }
    echo(`${dest}`);
    cp(source, dest);
  });
  Promise.all(promises);
};

const sync = (
  syncFrom: string,
  syncTo: string,
  checkUpdateBy: CheckUpdateBy
) => {
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
  updateFiles(syncFrom, syncTo, syncFromPaths, checkUpdateBy);
};

sync(syncFrom, syncTo, checkUpdateBy);
