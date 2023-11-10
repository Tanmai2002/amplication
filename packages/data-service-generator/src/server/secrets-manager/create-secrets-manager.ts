import {
  CreateServerSecretsManagerParams,
  EventNames,
  ModuleMap,
  SecretsNameKey,
} from "@amplication/code-gen-types";
import { print } from "@amplication/code-gen-utils";
import pluginWrapper from "../../plugin-wrapper";
import DsgContext from "../../dsg-context";
import { builders, namedTypes } from "ast-types";
import { createDTOFile } from "../resource/dto/create-dto-module";
import { pascalCase } from "pascal-case";
import path from "path";
import fg from "fast-glob";
import { promises as fsPromises } from "fs";
import { getFileEncoding } from "../../utils/get-file-encoding";

export function createSecretsManagerModule(
  eventParams: CreateServerSecretsManagerParams
): ModuleMap {
  return pluginWrapper(
    createSecretsManagerModuleInternal,
    EventNames.CreateServerSecretsManager,
    eventParams
  );
}

export async function createSecretsManagerModuleInternal({
  secretsNameKey,
}: CreateServerSecretsManagerParams): Promise<ModuleMap> {
  const context = DsgContext.getInstance;

  const { serverDirectories } = DsgContext.getInstance;

  const basePath = `${serverDirectories.srcDirectory}/providers/secrets`;
  const secretManagerStaticFilesDirectory = path.resolve(__dirname, "static");
  const staticFilesPath = await fg(
    `${secretManagerStaticFilesDirectory}/**/*`,
    {
      absolute: false,
      dot: true,
      ignore: ["**.js", "**.js.map", "**.d.ts"],
    }
  );

  const ENUM_MODULE_PATH = `${basePath}/secretsNameKey.enum.ts`;
  const enumDeclaration = createTSEnumSecretsNameKey(secretsNameKey);
  const enumFile = createDTOFile(enumDeclaration, ENUM_MODULE_PATH, {});

  const moduleMap = new ModuleMap(context.logger);
  await moduleMap.set({
    path: ENUM_MODULE_PATH,
    code: print(enumFile).code,
  });

  for (const modulePath of staticFilesPath) {
    const encoding = getFileEncoding(modulePath);
    const path = modulePath
      .replace(".template", "")
      .replace(secretManagerStaticFilesDirectory, basePath);
    const module = {
      path,
      code: await fsPromises.readFile(modulePath, encoding),
    };

    await moduleMap.set(module);
  }

  return moduleMap;
}

function createTSEnumSecretsNameKey(
  secretsNameKey: SecretsNameKey[]
): namedTypes.TSEnumDeclaration {
  const ENUM_SECRETS_NAME_KEY = builders.identifier("EnumSecretsNameKey");
  return builders.tsEnumDeclaration(
    ENUM_SECRETS_NAME_KEY,
    secretsNameKey.map(({ name, key }) =>
      builders.tsEnumMember(
        builders.identifier(pascalCase(name)),
        builders.stringLiteral(key)
      )
    )
  );
}
