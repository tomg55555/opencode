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
} from "../shared/ipc-rpc"
import type { WslServersPlatform } from "@opencode-ai/app/wsl/types"
import {
  type IpcEventListener,
  type IpcEventSubscription,
  type IpcInvokeMethod,
  type IpcSendMethod,
} from "../shared/ipc-rpc"

export type WslServersAPI = WslServersPlatform
export type UpdaterAPI = {
  subscribe: (cb: IpcEventListener<typeof UpdaterStateChanges._tag>) => Promise<() => void>
  check: IpcInvokeMethod<typeof UpdaterCheck._tag>
  install: IpcInvokeMethod<typeof UpdaterInstall._tag>
}

export type ElectronAPI = {
  awaitInitialization: IpcInvokeMethod<typeof AppAwaitInitialization._tag>
  wslServers: WslServersAPI
  updater: UpdaterAPI
  consumeInitialDeepLinks: IpcInvokeMethod<typeof AppConsumeInitialDeepLinks._tag>
  getDefaultServerUrl: IpcInvokeMethod<typeof AppGetDefaultServerUrl._tag>
  setDefaultServerUrl: IpcInvokeMethod<typeof AppSetDefaultServerUrl._tag>
  isFirstLaunchOnboardingPending: IpcInvokeMethod<typeof AppIsFirstLaunchOnboardingPending._tag>
  finishFirstLaunchOnboarding: IpcInvokeMethod<typeof AppFinishFirstLaunchOnboarding._tag>
  checkAppExists: IpcInvokeMethod<typeof AppCheckAppExists._tag>
  resolveAppPath: IpcInvokeMethod<typeof AppResolveAppPath._tag>
  storeGet: IpcInvokeMethod<typeof StorageGet._tag>
  storeSet: IpcInvokeMethod<typeof StorageSet._tag>
  storeDelete: IpcInvokeMethod<typeof StorageDelete._tag>
  storeClear: IpcInvokeMethod<typeof StorageClear._tag>
  storeKeys: IpcInvokeMethod<typeof StorageKeys._tag>
  storeLength: IpcInvokeMethod<typeof StorageLength._tag>
  draftGet: IpcInvokeMethod<typeof DraftsGet._tag>
  draftSet: IpcInvokeMethod<typeof DraftsSet._tag>
  draftDelete: IpcInvokeMethod<typeof DraftsDelete._tag>
  draftBlobPut: IpcInvokeMethod<typeof DraftsPutBlob._tag>
  draftBlobGet: IpcInvokeMethod<typeof DraftsGetBlob._tag>

  getWindowID: IpcInvokeMethod<typeof WindowGetId._tag>
  onMenuCommand: IpcEventSubscription<typeof MenuCommand._tag>
  onDeepLink: IpcEventSubscription<typeof AppDeepLink._tag>

  openDirectoryPicker: IpcInvokeMethod<typeof FilesOpenDirectoryPicker._tag>
  openFilePicker: IpcInvokeMethod<typeof FilesOpenFilePicker._tag>
  readPickedFile: IpcInvokeMethod<typeof FilesReadPickedFile._tag>
  releasePickedFiles: IpcInvokeMethod<typeof FilesReleasePickedFiles._tag>
  getPathForFile: (file: File) => string
  saveFilePicker: IpcInvokeMethod<typeof FilesSaveFilePicker._tag>
  openExternal: IpcSendMethod<typeof FilesOpenExternal._tag>
  openLocalFile: IpcSendMethod<typeof FilesOpenLocalFile._tag>
  openPath: IpcInvokeMethod<typeof FilesOpenPath._tag>
  revealPath: IpcInvokeMethod<typeof FilesRevealPath._tag>
  readClipboardImage: IpcInvokeMethod<typeof FilesReadClipboardImage._tag>
  getWindowFocused: IpcInvokeMethod<typeof WindowGetFocused._tag>
  getWindowFullscreen: IpcInvokeMethod<typeof WindowGetFullscreen._tag>
  onWindowFullscreenChanged: IpcEventSubscription<typeof WindowFullscreenChanged._tag>
  setWindowFocus: IpcInvokeMethod<typeof WindowSetFocus._tag>
  showWindow: IpcInvokeMethod<typeof WindowShow._tag>
  relaunch: IpcSendMethod<typeof AppRelaunch._tag>
  getZoomFactor: IpcInvokeMethod<typeof WindowGetZoomFactor._tag>
  setZoomFactor: IpcInvokeMethod<typeof WindowSetZoomFactor._tag>
  getPinchZoomEnabled: IpcInvokeMethod<typeof WindowGetPinchZoomEnabled._tag>
  setPinchZoomEnabled: IpcInvokeMethod<typeof WindowSetPinchZoomEnabled._tag>
  onPinchZoomEnabledChanged: IpcEventSubscription<typeof WindowPinchZoomEnabledChanged._tag>
  onZoomFactorChanged: IpcEventSubscription<typeof WindowZoomFactorChanged._tag>
  setTitlebar: IpcInvokeMethod<typeof WindowSetTitlebar._tag>
  runDesktopMenuAction: IpcInvokeMethod<typeof MenuRunAction._tag>
  setBackgroundColor: IpcInvokeMethod<typeof AppSetBackgroundColor._tag>
  exportDebugLogs: IpcInvokeMethod<typeof AppExportDebugLogs._tag>
  setForceFocus: IpcInvokeMethod<typeof AppSetForceFocus._tag>
  recordFatalRendererError: IpcInvokeMethod<typeof AppRecordFatalRendererError._tag>
  setNativeTranslations: IpcInvokeMethod<typeof AppSetNativeTranslations._tag>
}
