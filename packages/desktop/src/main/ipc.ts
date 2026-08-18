import {
  AppAwaitInitialization,
  AppCheckAppExists,
  AppConsumeInitialDeepLinks,
  AppDeepLink,
  AppExportDebugLogs,
  AppFinishFirstLaunchOnboarding,
  AppGetDefaultServerUrl,
  AppIsFirstLaunchOnboardingPending,
  AppRecordFatalRendererError,
  AppRelaunch,
  AppResolveAppPath,
  AppSetBackgroundColor,
  AppSetDefaultServerUrl,
  AppSetForceFocus,
  AppSetNativeTranslations,
  DraftsDelete,
  DraftsGet,
  DraftsGetBlob,
  DraftsPutBlob,
  DraftsSet,
  FilesOpenDirectoryPicker,
  FilesOpenExternal,
  FilesOpenFilePicker,
  FilesOpenLocalFile,
  FilesOpenPath,
  FilesReadClipboardImage,
  FilesReadPickedFile,
  FilesReleasePickedFiles,
  FilesRevealPath,
  FilesSaveFilePicker,
  IpcTransportPort,
  MenuCommand,
  MenuRunAction,
  StorageClear,
  StorageDelete,
  StorageGet,
  StorageKeys,
  StorageLength,
  StorageSet,
  UpdaterCheck,
  UpdaterInstall,
  UpdaterStateChanges,
  UpdaterSubscribe,
  UpdaterUnsubscribe,
  WindowFullscreenChanged,
  WindowGetFocused,
  WindowGetFullscreen,
  WindowGetId,
  WindowGetPinchZoomEnabled,
  WindowGetZoomFactor,
  WindowPinchZoomEnabledChanged,
  WindowSetFocus,
  WindowSetPinchZoomEnabled,
  WindowSetTitlebar,
  WindowSetZoomFactor,
  WindowShow,
  WindowZoomFactorChanged,
  WslAddServer,
  WslEvent,
  WslGetState,
  WslInstallDistro,
  WslInstallOpencode,
  WslInstallWsl,
  WslOpenTerminal,
  WslProbeAddable,
  WslProbeRuntime,
  WslRefreshDistros,
  WslRemoveServer,
  WslStartServer,
  WslSubscribe,
  WslUnsubscribe,
} from "../shared/ipc-rpc"
import { app, BrowserWindow, MessageChannelMain } from "electron"
import type { WebContents } from "electron"
import { parseDesktopNativeBundle, type DesktopNativeBundle } from "@opencode-ai/app/i18n/desktop-native"
import { Effect, Layer, ManagedRuntime, Stream } from "effect"
import { RpcServer } from "effect/unstable/rpc"
import { type FatalRendererError, type ServerReadyData } from "../shared/ipc-contract"
import { DesktopRpcs, type IpcEvent } from "../shared/ipc-rpc"
import { createFileCapabilities, openExternalURL, openLocalFileURL } from "./files"
import { ipcEventStream } from "./ipc-events"
import { IpcPortHandoff, IpcServerProtocolLive } from "./ipc-transport"
import { setForceFocus } from "./native/debug"
import { runDesktopMenuAction } from "./native/menu-actions"
import { createDesktopStorage } from "./storage"
import { getPinchZoomEnabled, getWindowID, setPinchZoomEnabled, setTitlebar, updateTitlebar } from "./windows"
import type { UpdaterIpc } from "./updater"
import type { WslIpc } from "./wsl/ipc"

type Deps = {
  relaunch: () => void
  awaitInitialization: () => Promise<ServerReadyData>
  consumeInitialDeepLinks: () => Promise<string[]> | string[]
  getDefaultServerUrl: () => Promise<string | null> | string | null
  setDefaultServerUrl: (url: string | null) => Promise<void> | void
  isFirstLaunchOnboardingPending: () => Promise<boolean> | boolean
  finishFirstLaunchOnboarding: (createDefaultProject: boolean) => Promise<string | null> | string | null
  checkAppExists: (appName: string) => Promise<boolean> | boolean
  resolveAppPath: (appName: string) => Promise<string | null>
  showUpdater: () => Promise<void> | void
  setBackgroundColor: (color: string) => void
  exportDebugLogs: () => Promise<string>
  recordFatalRendererError: (error: FatalRendererError) => Promise<void> | void
  setNativeTranslations: (bundle: DesktopNativeBundle) => void
}

export async function registerIpcHandlers(deps: Deps, updater: UpdaterIpc, wsl: WslIpc) {
  const files = createFileCapabilities()
  const storage = createDesktopStorage()
  const handlers = DesktopRpcs.toLayer(
    Effect.gen(function* () {
      const handoff = yield* IpcPortHandoff
      const sender = (context: { readonly client: { readonly id: number } }) =>
        requireSender(handoff.sender(context.client.id))
      const events = <Channel extends keyof IpcEvent>(
        channel: Channel,
        context: { readonly client: { readonly id: number } },
      ) => {
        const id = sender(context).id
        return ipcEventStream(id).pipe(
          Stream.filter((event) => event.channel === channel),
          Stream.map((event) => event.args as IpcEvent[Channel]),
        )
      }
      return DesktopRpcs.of({
        [AppAwaitInitialization._tag]: () => Effect.promise(() => deps.awaitInitialization()),
        [AppConsumeInitialDeepLinks._tag]: () => promise(deps.consumeInitialDeepLinks),
        [AppGetDefaultServerUrl._tag]: () => promise(deps.getDefaultServerUrl),
        [AppSetDefaultServerUrl._tag]: ([url]) => promise(() => deps.setDefaultServerUrl(url)),
        [AppIsFirstLaunchOnboardingPending._tag]: () => promise(deps.isFirstLaunchOnboardingPending),
        [AppFinishFirstLaunchOnboarding._tag]: ([createDefaultProject]) =>
          promise(() => deps.finishFirstLaunchOnboarding(createDefaultProject)),
        [AppCheckAppExists._tag]: ([appName]) => promise(() => deps.checkAppExists(appName)),
        [AppResolveAppPath._tag]: ([appName]) => Effect.promise(() => deps.resolveAppPath(appName)),
        [AppSetBackgroundColor._tag]: ([color]) => Effect.sync(() => deps.setBackgroundColor(color)),
        [AppExportDebugLogs._tag]: () => Effect.promise(() => deps.exportDebugLogs()),
        [AppSetForceFocus._tag]: ([enabled], context) => Effect.promise(() => setForceFocus(sender(context), enabled)),
        [AppRecordFatalRendererError._tag]: ([error]) => promise(() => deps.recordFatalRendererError(error)),
        [AppSetNativeTranslations._tag]: ([value], context) =>
          Effect.sync(() => {
            const contents = sender(context)
            const win = BrowserWindow.fromWebContents(contents)
            if (!win || win.isDestroyed() || win.webContents !== contents) {
              throw new Error("Invalid native translation sender")
            }
            const bundle = parseDesktopNativeBundle(value)
            if (!bundle) throw new Error("Invalid native translation bundle")
            deps.setNativeTranslations(bundle)
          }),
        [AppRelaunch._tag]: () => Effect.sync(deps.relaunch),
        [StorageGet._tag]: ([name, key]) => Effect.sync(() => storage.get(name, key)),
        [StorageSet._tag]: ([name, key, value]) => Effect.sync(() => storage.set(name, key, value)),
        [StorageDelete._tag]: ([name, key]) => Effect.sync(() => storage.deleteValue(name, key)),
        [StorageClear._tag]: ([name]) => Effect.sync(() => storage.clear(name)),
        [StorageKeys._tag]: ([name]) => Effect.sync(() => storage.keys(name)),
        [StorageLength._tag]: ([name]) => Effect.sync(() => storage.length(name)),
        [DraftsGet._tag]: ([key]) => Effect.sync(() => storage.drafts.get(key)),
        [DraftsSet._tag]: ([key, value]) => Effect.sync(() => storage.drafts.set(key, value)),
        [DraftsDelete._tag]: ([key]) => Effect.sync(() => storage.drafts.set(key, null)),
        [DraftsPutBlob._tag]: ([data]) =>
          Effect.sync(() =>
            storage.drafts.putBlob(
              data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
            ),
          ),
        [DraftsGetBlob._tag]: ([id]) =>
          Effect.sync(() => {
            const data = storage.drafts.getBlob(id)
            return data ? new Uint8Array(data) : null
          }),
        [FilesOpenDirectoryPicker._tag]: ([options]) => Effect.promise(() => files.openDirectoryPicker(options)),
        [FilesOpenFilePicker._tag]: ([options], context) =>
          Effect.promise(() =>
            files.openFilePicker(
              sender(context).id,
              options ? { ...options, extensions: options.extensions && [...options.extensions] } : undefined,
            ),
          ),
        [FilesReadPickedFile._tag]: ([token, path], context) =>
          Effect.promise(async () => new Uint8Array(await files.readPickedFile(sender(context).id, token, path))),
        [FilesReleasePickedFiles._tag]: ([token], context) =>
          Effect.sync(() => files.releasePickedFiles(sender(context).id, token)),
        [FilesSaveFilePicker._tag]: ([options]) => Effect.promise(() => files.saveFilePicker(options)),
        [FilesOpenExternal._tag]: ([url]) => Effect.sync(() => openExternalURL(url)),
        [FilesOpenLocalFile._tag]: ([url]) => Effect.sync(() => openLocalFileURL(url)),
        [FilesOpenPath._tag]: ([path, application]) =>
          Effect.promise(async () => (await files.openPath(path, application)) ?? null),
        [FilesRevealPath._tag]: ([path]) => Effect.promise(() => files.revealPath(path)),
        [FilesReadClipboardImage._tag]: () =>
          Effect.sync(() => {
            const image = files.readClipboardImage()
            return image ? { ...image, buffer: new Uint8Array(image.buffer) } : null
          }),
        [WindowGetId._tag]: (_args, context) =>
          Effect.sync(() => {
            const win = BrowserWindow.fromWebContents(sender(context))
            if (!win) throw new Error("Window not found")
            const id = getWindowID(win)
            if (!id) throw new Error("Window ID not found")
            return id
          }),
        [WindowGetFocused._tag]: (_args, context) =>
          Effect.sync(() => BrowserWindow.fromWebContents(sender(context))?.isFocused() ?? false),
        [WindowGetFullscreen._tag]: (_args, context) =>
          Effect.sync(() => BrowserWindow.fromWebContents(sender(context))?.isFullScreen() ?? false),
        [WindowSetFocus._tag]: (_args, context) =>
          Effect.sync(() => BrowserWindow.fromWebContents(sender(context))?.focus()),
        [WindowShow._tag]: (_args, context) =>
          Effect.sync(() => BrowserWindow.fromWebContents(sender(context))?.show()),
        [WindowGetZoomFactor._tag]: (_args, context) => Effect.sync(() => sender(context).getZoomFactor()),
        [WindowSetZoomFactor._tag]: ([factor], context) =>
          Effect.sync(() => {
            const contents = sender(context)
            contents.setZoomFactor(factor)
            const win = BrowserWindow.fromWebContents(contents)
            if (win) updateTitlebar(win)
          }),
        [WindowGetPinchZoomEnabled._tag]: () => Effect.sync(getPinchZoomEnabled),
        [WindowSetPinchZoomEnabled._tag]: ([enabled]) => Effect.sync(() => setPinchZoomEnabled(enabled)),
        [WindowSetTitlebar._tag]: ([theme], context) =>
          Effect.sync(() => {
            const win = BrowserWindow.fromWebContents(sender(context))
            if (win) setTitlebar(win, theme)
          }),
        [MenuRunAction._tag]: ([action], context) =>
          Effect.sync(() =>
            runDesktopMenuAction(BrowserWindow.fromWebContents(sender(context)), action, {
              checkForUpdates: () => void deps.showUpdater(),
              relaunch: deps.relaunch,
            }),
          ),
        [UpdaterSubscribe._tag]: (_args, context) => Effect.sync(() => updater.subscribe(sender(context))),
        [UpdaterUnsubscribe._tag]: (_args, context) => Effect.sync(() => updater.unsubscribe(sender(context).id)),
        [UpdaterCheck._tag]: () => Effect.promise(() => updater.check()),
        [UpdaterInstall._tag]: () => Effect.promise(() => updater.install()),
        [WslSubscribe._tag]: (_args, context) => Effect.sync(() => wsl.subscribe(sender(context))),
        [WslUnsubscribe._tag]: (_args, context) => Effect.sync(() => wsl.unsubscribe(sender(context).id)),
        [WslGetState._tag]: () => Effect.sync(() => wsl.getState()),
        [WslProbeRuntime._tag]: () => Effect.promise(() => wsl.probeRuntime()),
        [WslRefreshDistros._tag]: () => Effect.promise(() => wsl.refreshDistros()),
        [WslInstallWsl._tag]: () => Effect.promise(() => wsl.installWsl()),
        [WslInstallDistro._tag]: ([name]) => Effect.promise(() => wsl.installDistro(name)),
        [WslProbeAddable._tag]: ([distros]) => Effect.promise(() => wsl.probeAddable([...distros])),
        [WslInstallOpencode._tag]: ([name]) => Effect.promise(() => wsl.installOpencode(name)),
        [WslOpenTerminal._tag]: ([name]) => Effect.promise(() => wsl.openTerminal(name)),
        [WslAddServer._tag]: ([distro]) => Effect.promise(() => wsl.addServer(distro)),
        [WslRemoveServer._tag]: ([id]) => Effect.promise(() => wsl.removeServer(id)),
        [WslStartServer._tag]: ([id]) => Effect.promise(() => wsl.startServer(id)),
        [AppDeepLink._tag]: (_args, context) => events(AppDeepLink._tag, context),
        [MenuCommand._tag]: (_args, context) => events(MenuCommand._tag, context),
        [UpdaterStateChanges._tag]: (_args, context) => events(UpdaterStateChanges._tag, context),
        [WslEvent._tag]: (_args, context) => events(WslEvent._tag, context),
        [WindowFullscreenChanged._tag]: (_args, context) => events(WindowFullscreenChanged._tag, context),
        [WindowPinchZoomEnabledChanged._tag]: (_args, context) => events(WindowPinchZoomEnabledChanged._tag, context),
        [WindowZoomFactorChanged._tag]: (_args, context) => events(WindowZoomFactorChanged._tag, context),
      })
    }),
  )
  const live = RpcServer.layer(DesktopRpcs, { disableFatalDefects: true }).pipe(
    Layer.provide(handlers),
    Layer.provideMerge(IpcServerProtocolLive),
  )
  const runtime = ManagedRuntime.make(live)
  const handoff = await runtime.runPromise(IpcPortHandoff)
  const wire = (_event: Electron.Event, win: BrowserWindow) => {
    win.webContents.on("did-finish-load", () => {
      if (win.isDestroyed() || win.webContents.isDestroyed()) return
      const channel = new MessageChannelMain()
      handoff.bind(win.webContents, channel.port1)
      win.webContents.postMessage(IpcTransportPort, null, [channel.port2])
    })
  }
  app.on("browser-window-created", wire)
  BrowserWindow.getAllWindows().forEach((win) => wire({} as Electron.Event, win))
  app.once("will-quit", () => {
    app.off("browser-window-created", wire)
    void runtime.dispose()
  })
}

function promise<A>(evaluate: () => A | Promise<A>) {
  return Effect.promise(async () => evaluate())
}

function requireSender(sender: WebContents | undefined) {
  if (!sender || sender.isDestroyed()) throw new Error("Renderer connection not found")
  return sender
}
