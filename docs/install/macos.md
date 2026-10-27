# Install Unreal Dojo on macOS

This guide is for the unsigned macOS installer (a `.dmg`). It takes about ten minutes, plus the time to install Unreal Engine and Xcode if you do not have them yet.

## Before you start

You need three things on the Mac. The app checks them on first run and tells you what is missing, so you can also install the app first and fix gaps as it reports them.

1. **Unreal Engine 5.8** from the Epic Games Launcher. UE 5.4 to 5.7 also work, through the fallback loop (the app builds with Unreal Build Tool and runs tests in a headless editor). Live Coding does not exist on macOS, so a Mac always uses that loop.
2. **Full Xcode** from the App Store, not only the Command Line Tools. Open it once so it can finish installing its parts, then run these in Terminal if the app asks for them:

   ```bash
   sudo xcode-select -s /Applications/Xcode.app
   ```

   ```bash
   sudo xcodebuild -license accept
   ```

3. **The Metal toolchain**, on Xcode 26 and later (it is a separate download there). Builds and tests work without it, but the Unreal editor window will not open:

   ```bash
   xcodebuild -downloadComponent MetalToolchain
   ```

You also need about 100 GB of free disk space for the engine, plus a few GB for the sandbox project.

## Get the installer

The repository is private, so the installer comes from a GitHub Actions run:

1. Sign in to GitHub and open the repository's **Actions** tab.
2. Open the newest green **ci** run on `main`.
3. At the bottom, under **Artifacts**, download `installers-macos-latest`.
4. Unzip it. Inside are two disk images:
   - the one whose name ends in `-arm64` is for Macs with Apple silicon (M1 and later);
   - the one without that ending is for Intel Macs.

   Not sure which Mac you have? Open the Apple menu and choose **About This Mac**: it says **Chip** for Apple silicon and **Processor** for Intel.

Artifacts expire after 7 days. If none is left, run the workflow by hand: **Actions**, **ci**, **Run workflow**, choose `main`.

Public release: not yet. A download link will go here when the app is published.

## Install and open it past Gatekeeper

The app is not signed or notarized, because an Apple Developer ID costs money. macOS Gatekeeper blocks every app like that the first time.

1. Open the `.dmg` and drag **Unreal Dojo** onto **Applications**.
2. Eject the disk image.
3. Remove the quarantine mark that downloads carry, by running this in Terminal:

   ```bash
   xattr -dr com.apple.quarantine "/Applications/Unreal Dojo.app"
   ```

4. Open **Unreal Dojo** from **Applications**.

Start with the Terminal command on a Mac with Apple silicon. An unsigned app there often shows "Unreal Dojo is damaged and can't be opened", and for that message neither route below offers a way through. The command fixes it. macOS remembers the app afterwards, so later launches work with a normal double-click.

If you would rather not use Terminal, or you are on an Intel Mac and the app only shows an "unidentified developer" warning, use one of these:

- **Right-click Open:** in **Applications**, right-click (or Control-click) **Unreal Dojo**, choose **Open**, and press **Open** again.
- **Open Anyway** (macOS 15 Sequoia and later, where right-click Open often has no Open button): double-click **Unreal Dojo** once and press **Done** on the warning. Open **System Settings**, then **Privacy & Security**, scroll to **Security**, and next to "Unreal Dojo was blocked" press **Open Anyway**. Confirm with your password or Touch ID.

The app has no custom icon yet, so the Dock shows the default Electron icon.

To remove the app, drag it from **Applications** to the Trash. Your progress stays behind in the data folder below, so a reinstall picks up where you left off.

## First run

The app opens on a title screen that asks for your name (what your studio should call you). Type it and press **Set up your studio**. Then:

1. **Pick the engine.** The app lists the Unreal installs it finds (`/Users/Shared/Epic Games` and `~/Applications` are searched). Choose one and press **Use this engine**. If a toolchain problem is shown (Xcode missing or not selected, license not accepted, no Metal toolchain), fix it, then check again.
2. **Choose a folder for the sandbox project.** Pick or create an empty folder, for example `~/DojoSandbox`.
3. **Start the build.** The app copies the sandbox project and compiles it once. This usually takes a few minutes and runs in the app.
4. **Open the editor once** (you may skip it). Then press **Enter your studio**.

## Where your saves live

| What | Where |
| --- | --- |
| Progress (`progress.json`, with the previous copy as `progress.json.bak`) | `~/Library/Application Support/Unreal Dojo` |
| Settings (`config.json`, API key stored encrypted) | `~/Library/Application Support/Unreal Dojo` |
| The sandbox Unreal project | The folder you chose on first run |

In Finder, choose **Go**, **Go to Folder**, and paste `~/Library/Application Support/Unreal Dojo` to open the data folder. Copy `progress.json` to back up your progress.

## Set up AI review

Open **Settings**, then the **Code review** panel. Use **Claude Code** (install it, sign in once in a terminal, then press **Test Claude Code**) or paste an **Anthropic API key**. The key is encrypted with the macOS Keychain (Electron `safeStorage`) and is never shown again or kept in plain text. The first time the app uses it, macOS may ask to let Unreal Dojo use the Keychain. The full steps are in the [README](../../README.md#set-up-ai-review).

## If something goes wrong

- **"Unreal Dojo is damaged and can't be opened."** This is the quarantine mark on an unsigned app. Run the `xattr` command above.
- **The first build fails.** The message names the cause. The common ones are Xcode not selected (`xcode-select` points at the Command Line Tools), a license that has not been accepted, and an engine that is not a supported version.
- **Settings shows Claude Code as not signed in.** Run `claude` in Terminal once and sign in, then press **Test Claude Code** again.
