// Decides where the content folder is: next to package.json in dev, next to the app archive when packaged (A13).
import { join } from "node:path";

/** What the content root depends on; `app.isPackaged`, `process.resourcesPath`, and `app.getAppPath()` in the real app. */
export interface ContentRootInputs
{
	/** True when running from an installer build. */
	isPackaged: boolean;

	/** The packaged app's resources folder, where electron-builder copies `content/` as an extra resource. */
	resourcesPath: string;

	/** The app folder (the project folder in dev). */
	appPath: string;
}

/** Returns the content folder: `<resourcesPath>/content` when packaged, `<appPath>/content` in dev and tests. */
export function resolveContentRoot(inputs: ContentRootInputs): string
{
	return inputs.isPackaged ? join(inputs.resourcesPath, "content") : join(inputs.appPath, "content");
}
