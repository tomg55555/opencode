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
import { contextBridge, webUtils } from "electron"
import type { ElectronAPI } from "./types"
import type { UpdaterState } from "@opencode-ai/app/updater"
import { invoke, listen, send } from "./ipc-client"

const updaterCallbacks = new Set<(state: UpdaterState) => void>()
let updaterState: UpdaterState | undefined
let updaterSubscription: Promise<void> | undefined
let updaterListener: (() => void) | undefined
const updaterHandler = (state: UpdaterState) => {
  updaterState = state
  updaterCallbacks.forEach((callback) => callback(state))
}

const api: ElectronAPI = {
  awaitInitialization: () => invoke(AppAwaitInitialization._tag),
  wslServers: {
    getState: () => invoke(WslGetState._tag),
    subscribe: (cb) => {
      const dispose = listen(WslEvent._tag, cb)
      void invoke(WslSubscribe._tag)
      return () => {
        dispose()
        void invoke(WslUnsubscribe._tag)
      }
    },
    probeRuntime: () => invoke(WslProbeRuntime._tag),
    refreshDistros: () => invoke(WslRefreshDistros._tag),
    installWsl: () => invoke(WslInstallWsl._tag),
    installDistro: (name) => invoke(WslInstallDistro._tag, name),
    probeAddable: (distros) => invoke(WslProbeAddable._tag, distros),
    installOpencode: (name) => invoke(WslInstallOpencode._tag, name),
    openTerminal: (name) => invoke(WslOpenTerminal._tag, name),
    addServer: (distro) => invoke(WslAddServer._tag, distro),
    removeServer: (id) => invoke(WslRemoveServer._tag, id),
    startServer: (id) => invoke(WslStartServer._tag, id),
  },
  updater: {
    subscribe: async (cb) => {
      updaterCallbacks.add(cb)
      if (updaterState) cb(updaterState)
      if (!updaterSubscription) {
        updaterListener = listen(UpdaterStateChanges._tag, updaterHandler)
        updaterSubscription = invoke(UpdaterSubscribe._tag)
      }
      await updaterSubscription
      return () => {
        updaterCallbacks.delete(cb)
        if (updaterCallbacks.size > 0) return
        updaterListener?.()
        updaterListener = undefined
        updaterSubscription = undefined
        void invoke(UpdaterUnsubscribe._tag)
      }
    },
    check: () => invoke(UpdaterCheck._tag),
    install: () => invoke(UpdaterInstall._tag),
  },
  consumeInitialDeepLinks: () => invoke(AppConsumeInitialDeepLinks._tag),
  getDefaultServerUrl: () => invoke(AppGetDefaultServerUrl._tag),
  setDefaultServerUrl: (url) => invoke(AppSetDefaultServerUrl._tag, url),
  isFirstLaunchOnboardingPending: () => invoke(AppIsFirstLaunchOnboardingPending._tag),
  finishFirstLaunchOnboarding: (createDefaultProject) =>
    invoke(AppFinishFirstLaunchOnboarding._tag, createDefaultProject),
  checkAppExists: (appName) => invoke(AppCheckAppExists._tag, appName),
  resolveAppPath: (appName) => invoke(AppResolveAppPath._tag, appName),
  storeGet: (name, key) => invoke(StorageGet._tag, name, key),
  storeSet: (name, key, value) => invoke(StorageSet._tag, name, key, value),
  storeDelete: (name, key) => invoke(StorageDelete._tag, name, key),
  storeClear: (name) => invoke(StorageClear._tag, name),
  storeKeys: (name) => invoke(StorageKeys._tag, name),
  storeLength: (name) => invoke(StorageLength._tag, name),
  draftGet: (key) => invoke(DraftsGet._tag, key),
  draftSet: (key, value) => invoke(DraftsSet._tag, key, value),
  draftDelete: (key) => invoke(DraftsDelete._tag, key),
  draftBlobPut: (data) => invoke(DraftsPutBlob._tag, data),
  draftBlobGet: (id) => invoke(DraftsGetBlob._tag, id),

  getWindowID: () => invoke(WindowGetId._tag),
  onMenuCommand: (cb) => listen(MenuCommand._tag, cb),
  onDeepLink: (cb) => listen(AppDeepLink._tag, cb),

  openDirectoryPicker: (opts) => invoke(FilesOpenDirectoryPicker._tag, opts),
  openFilePicker: (opts) => invoke(FilesOpenFilePicker._tag, opts),
  readPickedFile: (token, path) => invoke(FilesReadPickedFile._tag, token, path),
  releasePickedFiles: (token) => invoke(FilesReleasePickedFiles._tag, token),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  saveFilePicker: (opts) => invoke(FilesSaveFilePicker._tag, opts),
  openExternal: (url) => send(FilesOpenExternal._tag, url),
  openLocalFile: (url) => send(FilesOpenLocalFile._tag, url),
  openPath: (path, app) => invoke(FilesOpenPath._tag, path, app),
  revealPath: (path) => invoke(FilesRevealPath._tag, path),
  readClipboardImage: () => invoke(FilesReadClipboardImage._tag),
  getWindowFocused: () => invoke(WindowGetFocused._tag),
  getWindowFullscreen: () => invoke(WindowGetFullscreen._tag),
  onWindowFullscreenChanged: (cb) => listen(WindowFullscreenChanged._tag, cb),
  setWindowFocus: () => invoke(WindowSetFocus._tag),
  showWindow: () => invoke(WindowShow._tag),
  relaunch: () => send(AppRelaunch._tag),
  getZoomFactor: () => invoke(WindowGetZoomFactor._tag),
  setZoomFactor: (factor) => invoke(WindowSetZoomFactor._tag, factor),
  getPinchZoomEnabled: () => invoke(WindowGetPinchZoomEnabled._tag),
  setPinchZoomEnabled: (enabled) => invoke(WindowSetPinchZoomEnabled._tag, enabled),
  onPinchZoomEnabledChanged: (cb) => listen(WindowPinchZoomEnabledChanged._tag, cb),
  onZoomFactorChanged: (cb) => listen(WindowZoomFactorChanged._tag, cb),
  setTitlebar: (theme) => invoke(WindowSetTitlebar._tag, theme),
  runDesktopMenuAction: (action) => invoke(MenuRunAction._tag, action),
  setBackgroundColor: (color) => invoke(AppSetBackgroundColor._tag, color),
  exportDebugLogs: () => invoke(AppExportDebugLogs._tag),
  setForceFocus: (enabled) => invoke(AppSetForceFocus._tag, enabled),
  recordFatalRendererError: (error) => invoke(AppRecordFatalRendererError._tag, error),
  setNativeTranslations: (bundle) => invoke(AppSetNativeTranslations._tag, bundle),
}

contextBridge.exposeInMainWorld("api", api)
