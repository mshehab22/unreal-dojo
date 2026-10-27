# Install Unreal Dojo on Windows

This guide is for the unsigned Windows installer. It takes about ten minutes, plus the time to install Unreal Engine and Visual Studio if you do not have them yet.

## Before you start

You need three things on the PC. The app checks them on first run and tells you what is missing, so you can also install the app first and fix gaps as it reports them.

1. **Unreal Engine 5.8** from the Epic Games Launcher. UE 5.4 to 5.7 also work, through the slower fallback loop (the app builds with Unreal Build Tool and runs tests in a headless editor).
2. **Visual Studio 2022 version 17.14 or later** (Visual Studio 2026 also works), with the **Game development with C++** workload ticked. If you already have Visual Studio, open the Visual Studio Installer, choose **Modify**, and tick that workload. Choose **Update** if your version is older than 17.14.
3. About 100 GB of free disk space for the engine, plus a few GB for the sandbox project.

The installer is for 64-bit Windows (x64).

## Get the installer

The repository is private, so the installer comes from a GitHub Actions run:

1. Sign in to GitHub and open the repository's **Actions** tab.
2. Open the newest green **ci** run on `main`.
3. At the bottom, under **Artifacts**, download `installers-windows-latest`.
4. Unzip it. Inside is one file named `Unreal Dojo Setup 0.1.0.exe` (the number is the app version).

Artifacts expire after 7 days. If none is left, run the workflow by hand: **Actions**, **ci**, **Run workflow**, choose `main`.

Public release: not yet. A download link will go here when the app is published.

## Run the installer past SmartScreen

The installer is not signed, because a signing certificate costs money. Windows SmartScreen warns about every unsigned installer it has not seen before.

1. Double-click `Unreal Dojo Setup 0.1.0.exe`.
2. A blue box says **Windows protected your PC**. Click **More info**.
3. A **Run anyway** button appears. Click it.
4. If your browser or an antivirus tool also flags the downloaded file, tell it to keep the file.

You can check that the file is the one CI built by comparing its size with the run's log, which prints the file list before the upload.

## The install steps

The installer is not one-click, so it walks you through a few pages.

1. On the first page, keep **Only for me** selected and press **Next**. That installs for your own user and needs no administrator rights. **Anyone who uses this computer** would ask for them.
2. Choose the install folder, or keep the default (`%LOCALAPPDATA%\Programs\Unreal Dojo`).
3. Press **Install**, then **Finish**.
4. Start **Unreal Dojo** from the Start menu or the desktop shortcut.

The app has no custom icon yet, so Windows shows the default Electron icon.

To remove it, open **Settings**, **Apps**, **Installed apps**, find **Unreal Dojo**, and choose **Uninstall**. Your progress stays behind in the data folder below, so a reinstall picks up where you left off.

## First run

The app opens on a title screen that asks for your name (what your studio should call you). Type it and press **Set up your studio**. Then:

1. **Pick the engine.** The app lists the Unreal installs it finds, usually `C:\Program Files\Epic Games\UE_5.8`. Choose one and press **Use this engine**. If a toolchain problem is shown (no Visual Studio, a missing workload, a version older than 17.14), fix it, then check again.
2. **Choose a folder for the sandbox project.** Pick or create an empty folder with a short path, for example `C:\DojoSandbox`. Long paths break Unreal builds, and the app warns you past 100 characters.
3. **Start the build.** The app copies the sandbox project and compiles it once. This usually takes a few minutes and runs in the app.
4. **Open the editor once** (you may skip it). Then press **Enter your studio**.

## Where your saves live

| What | Where |
| --- | --- |
| Progress (`progress.json`, with the previous copy as `progress.json.bak`) | `%APPDATA%\Unreal Dojo` |
| Settings (`config.json`, API key stored encrypted) | `%APPDATA%\Unreal Dojo` |
| The sandbox Unreal project | The folder you chose on first run |

Paste `%APPDATA%\Unreal Dojo` into the File Explorer address bar to open the data folder. Copy `progress.json` to back up your progress.

## Set up AI review

Open **Settings**, then the **Code review** panel. Use **Claude Code** (install it, sign in once in a terminal, then press **Test Claude Code**) or paste an **Anthropic API key**. The key is encrypted with Windows' own data protection (Electron `safeStorage`) and is never shown again or kept in plain text. The full steps are in the [README](../../README.md#set-up-ai-review).

## If something goes wrong

- **The installer does nothing after Run anyway.** Right-click the `.exe`, choose **Properties**, tick **Unblock** at the bottom of the General tab if it is there, press **OK**, and run it again.
- **The first build fails.** The message names the cause. The common ones are a Visual Studio without the C++ game workload, a Visual Studio older than 17.14, and a sandbox path that is too long.
- **Settings shows Claude Code as not signed in.** Run `claude` in a terminal once and sign in, then press **Test Claude Code** again.
