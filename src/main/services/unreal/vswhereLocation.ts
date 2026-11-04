// Where the Visual Studio Installer keeps vswhere, shared by the toolchain check and the MSVC compiler search.

/** `%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe`, with the usual folder when the variable is missing. */
export function vswhereLocation(programFilesX86: string | undefined): string
{
	return `${programFilesX86 ?? "C:\\Program Files (x86)"}\\Microsoft Visual Studio\\Installer\\vswhere.exe`;
}
