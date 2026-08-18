import { Schema } from "effect"
import { Rpc, RpcClient, RpcClientError, RpcGroup } from "effect/unstable/rpc"

const OptionalString = Schema.optionalKey(Schema.String)
const PickerOptions = Schema.Struct({
  multiple: Schema.optionalKey(Schema.Boolean),
  title: OptionalString,
  defaultPath: OptionalString,
})
const FilePickerOptions = Schema.Struct({
  multiple: Schema.optionalKey(Schema.Boolean),
  title: OptionalString,
  defaultPath: OptionalString,
  extensions: Schema.optionalKey(Schema.Array(Schema.String)),
})
const SavePickerOptions = Schema.Struct({
  title: OptionalString,
  defaultPath: OptionalString,
})
const ServerReadyData = Schema.Struct({
  url: Schema.String,
  username: Schema.NullOr(Schema.String),
  password: Schema.NullOr(Schema.String),
})
const PickedFiles = Schema.Struct({
  token: Schema.String,
  files: Schema.Array(Schema.Struct({ path: Schema.String, name: Schema.String, size: Schema.Number })),
})
const ClipboardImage = Schema.Struct({
  buffer: Schema.Uint8Array,
  width: Schema.Number,
  height: Schema.Number,
})
const UpdaterStateSchema = Schema.Union([
  Schema.Struct({ status: Schema.Literal("disabled") }),
  Schema.Struct({ status: Schema.Literal("idle") }),
  Schema.Struct({ status: Schema.Literal("checking") }),
  Schema.Struct({ status: Schema.Literal("downloading"), version: Schema.String }),
  Schema.Struct({ status: Schema.Literal("ready"), version: Schema.String }),
  Schema.Struct({ status: Schema.Literal("up-to-date") }),
  Schema.Struct({ status: Schema.Literal("installing"), version: Schema.String }),
  Schema.Struct({ status: Schema.Literal("error"), message: Schema.String }),
])
const DesktopMenuAction = Schema.Literals([
  "app.checkForUpdates",
  "app.relaunch",
  "edit.undo",
  "edit.redo",
  "edit.cut",
  "edit.copy",
  "edit.paste",
  "edit.delete",
  "edit.selectAll",
  "view.reload",
  "view.toggleDevTools",
  "view.resetZoom",
  "view.zoomIn",
  "view.zoomOut",
  "view.toggleFullscreen",
  "window.new",
  "window.close",
  "window.minimize",
  "window.toggleMaximize",
])
const WslServerConfig = Schema.Struct({ id: Schema.String, distro: Schema.String })
const WslServerRuntime = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("starting") }),
  Schema.Struct({
    kind: Schema.Literal("ready"),
    url: Schema.String,
    username: Schema.NullOr(Schema.String),
    password: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({ kind: Schema.Literal("failed"), message: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("stopped") }),
])
const WslJob = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("runtime"), startedAt: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal("distros"), startedAt: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal("install-wsl"), startedAt: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal("install-distro"), distro: Schema.String, startedAt: Schema.Number }),
  Schema.Struct({
    kind: Schema.Literal("probe-addable"),
    distros: Schema.Array(Schema.String),
    startedAt: Schema.Number,
  }),
  Schema.Struct({ kind: Schema.Literal("install-opencode"), distro: Schema.String, startedAt: Schema.Number }),
])
const WslServersState = Schema.Struct({
  runtime: Schema.NullOr(
    Schema.Struct({
      available: Schema.Boolean,
      version: Schema.NullOr(Schema.String),
      error: Schema.NullOr(Schema.String),
    }),
  ),
  installed: Schema.Array(
    Schema.Struct({ name: Schema.String, version: Schema.NullOr(Schema.Number), isDefault: Schema.Boolean }),
  ),
  online: Schema.Array(Schema.Struct({ name: Schema.String, label: Schema.String })),
  distroProbes: Schema.Record(
    Schema.String,
    Schema.Struct({
      name: Schema.String,
      canExecute: Schema.Boolean,
      hasBash: Schema.Boolean,
      hasCurl: Schema.Boolean,
      error: Schema.NullOr(Schema.String),
    }),
  ),
  opencodeChecks: Schema.Record(
    Schema.String,
    Schema.Struct({
      distro: Schema.String,
      resolvedPath: Schema.NullOr(Schema.String),
      version: Schema.NullOr(Schema.String),
      expectedVersion: Schema.NullOr(Schema.String),
      matchesDesktop: Schema.NullOr(Schema.Boolean),
      error: Schema.NullOr(Schema.String),
    }),
  ),
  pendingRestart: Schema.Boolean,
  servers: Schema.Array(Schema.Struct({ config: WslServerConfig, runtime: WslServerRuntime })),
  job: Schema.NullOr(WslJob),
})
const WslServersEvent = Schema.Struct({ type: Schema.Literal("state"), state: WslServersState })

const noArgs = Schema.Tuple([])
const voidResult = Schema.Void

export const IpcTransportPort = "desktop-rpc-port"

export const AppAwaitInitialization = Rpc.make("AppAwaitInitialization", { payload: noArgs, success: ServerReadyData })

export const AppConsumeInitialDeepLinks = Rpc.make("AppConsumeInitialDeepLinks", {
  payload: noArgs,
  success: Schema.Array(Schema.String),
})

export const AppGetDefaultServerUrl = Rpc.make("AppGetDefaultServerUrl", {
  payload: noArgs,
  success: Schema.NullOr(Schema.String),
})

export const AppSetDefaultServerUrl = Rpc.make("AppSetDefaultServerUrl", {
  payload: Schema.Tuple([Schema.NullOr(Schema.String)]),
  success: voidResult,
})

export const AppIsFirstLaunchOnboardingPending = Rpc.make("AppIsFirstLaunchOnboardingPending", {
  payload: noArgs,
  success: Schema.Boolean,
})

export const AppFinishFirstLaunchOnboarding = Rpc.make("AppFinishFirstLaunchOnboarding", {
  payload: Schema.Tuple([Schema.Boolean]),
  success: Schema.NullOr(Schema.String),
})

export const AppCheckAppExists = Rpc.make("AppCheckAppExists", {
  payload: Schema.Tuple([Schema.String]),
  success: Schema.Boolean,
})

export const AppResolveAppPath = Rpc.make("AppResolveAppPath", {
  payload: Schema.Tuple([Schema.String]),
  success: Schema.NullOr(Schema.String),
})

export const AppSetBackgroundColor = Rpc.make("AppSetBackgroundColor", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const AppExportDebugLogs = Rpc.make("AppExportDebugLogs", { payload: noArgs, success: Schema.String })

export const AppSetForceFocus = Rpc.make("AppSetForceFocus", {
  payload: Schema.Tuple([Schema.Boolean]),
  success: voidResult,
})

export const AppRecordFatalRendererError = Rpc.make("AppRecordFatalRendererError", {
  payload: Schema.Tuple([
    Schema.Struct({
      error: Schema.String,
      url: Schema.String,
      version: Schema.optionalKey(Schema.String),
      platform: Schema.String,
      os: Schema.optionalKey(Schema.String),
    }),
  ]),
  success: voidResult,
})

export const AppSetNativeTranslations = Rpc.make("AppSetNativeTranslations", {
  payload: Schema.Tuple([Schema.Unknown]),
  success: voidResult,
})

export const AppRelaunch = Rpc.make("AppRelaunch", { payload: noArgs, success: voidResult })

export const StorageGet = Rpc.make("StorageGet", {
  payload: Schema.Tuple([Schema.String, Schema.String]),
  success: Schema.NullOr(Schema.String),
})

export const StorageSet = Rpc.make("StorageSet", {
  payload: Schema.Tuple([Schema.String, Schema.String, Schema.String]),
  success: voidResult,
})

export const StorageDelete = Rpc.make("StorageDelete", {
  payload: Schema.Tuple([Schema.String, Schema.String]),
  success: voidResult,
})

export const StorageClear = Rpc.make("StorageClear", { payload: Schema.Tuple([Schema.String]), success: voidResult })

export const StorageKeys = Rpc.make("StorageKeys", {
  payload: Schema.Tuple([Schema.String]),
  success: Schema.Array(Schema.String),
})

export const StorageLength = Rpc.make("StorageLength", {
  payload: Schema.Tuple([Schema.String]),
  success: Schema.Number,
})

export const DraftsGet = Rpc.make("DraftsGet", {
  payload: Schema.Tuple([Schema.String]),
  success: Schema.NullOr(Schema.String),
})

export const DraftsSet = Rpc.make("DraftsSet", {
  payload: Schema.Tuple([Schema.String, Schema.String]),
  success: voidResult,
})

export const DraftsDelete = Rpc.make("DraftsDelete", { payload: Schema.Tuple([Schema.String]), success: voidResult })

export const DraftsPutBlob = Rpc.make("DraftsPutBlob", {
  payload: Schema.Tuple([Schema.Uint8Array]),
  success: Schema.String,
})

export const DraftsGetBlob = Rpc.make("DraftsGetBlob", {
  payload: Schema.Tuple([Schema.String]),
  success: Schema.NullOr(Schema.Uint8Array),
})

export const FilesOpenDirectoryPicker = Rpc.make("FilesOpenDirectoryPicker", {
  payload: Schema.Union([Schema.Tuple([]), Schema.Tuple([PickerOptions])]),
  success: Schema.NullOr(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
})

export const FilesOpenFilePicker = Rpc.make("FilesOpenFilePicker", {
  payload: Schema.Union([Schema.Tuple([]), Schema.Tuple([FilePickerOptions])]),
  success: Schema.NullOr(PickedFiles),
})

export const FilesReadPickedFile = Rpc.make("FilesReadPickedFile", {
  payload: Schema.Tuple([Schema.String, Schema.String]),
  success: Schema.Uint8Array,
})

export const FilesReleasePickedFiles = Rpc.make("FilesReleasePickedFiles", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const FilesSaveFilePicker = Rpc.make("FilesSaveFilePicker", {
  payload: Schema.Union([Schema.Tuple([]), Schema.Tuple([SavePickerOptions])]),
  success: Schema.NullOr(Schema.String),
})

export const FilesOpenExternal = Rpc.make("FilesOpenExternal", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const FilesOpenLocalFile = Rpc.make("FilesOpenLocalFile", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const FilesOpenPath = Rpc.make("FilesOpenPath", {
  payload: Schema.Union([Schema.Tuple([Schema.String]), Schema.Tuple([Schema.String, Schema.String])]),
  success: Schema.NullOr(Schema.String),
})

export const FilesRevealPath = Rpc.make("FilesRevealPath", {
  payload: Schema.Tuple([Schema.String]),
  success: Schema.Boolean,
})

export const FilesReadClipboardImage = Rpc.make("FilesReadClipboardImage", {
  payload: noArgs,
  success: Schema.NullOr(ClipboardImage),
})

export const WindowGetId = Rpc.make("WindowGetId", { payload: noArgs, success: Schema.String })

export const WindowGetFocused = Rpc.make("WindowGetFocused", { payload: noArgs, success: Schema.Boolean })

export const WindowGetFullscreen = Rpc.make("WindowGetFullscreen", { payload: noArgs, success: Schema.Boolean })

export const WindowSetFocus = Rpc.make("WindowSetFocus", { payload: noArgs, success: voidResult })

export const WindowShow = Rpc.make("WindowShow", { payload: noArgs, success: voidResult })

export const WindowGetZoomFactor = Rpc.make("WindowGetZoomFactor", { payload: noArgs, success: Schema.Number })

export const WindowSetZoomFactor = Rpc.make("WindowSetZoomFactor", {
  payload: Schema.Tuple([Schema.Number]),
  success: voidResult,
})

export const WindowGetPinchZoomEnabled = Rpc.make("WindowGetPinchZoomEnabled", {
  payload: noArgs,
  success: Schema.Boolean,
})

export const WindowSetPinchZoomEnabled = Rpc.make("WindowSetPinchZoomEnabled", {
  payload: Schema.Tuple([Schema.Boolean]),
  success: voidResult,
})

export const WindowSetTitlebar = Rpc.make("WindowSetTitlebar", {
  payload: Schema.Tuple([
    Schema.Struct({
      mode: Schema.Literals(["light", "dark"]),
      scheme: Schema.optionalKey(Schema.Literals(["system", "light", "dark"])),
    }),
  ]),
  success: voidResult,
})

export const MenuRunAction = Rpc.make("MenuRunAction", {
  payload: Schema.Tuple([DesktopMenuAction]),
  success: voidResult,
})

export const UpdaterSubscribe = Rpc.make("UpdaterSubscribe", { payload: noArgs, success: voidResult })

export const UpdaterUnsubscribe = Rpc.make("UpdaterUnsubscribe", { payload: noArgs, success: voidResult })

export const UpdaterCheck = Rpc.make("UpdaterCheck", { payload: noArgs, success: UpdaterStateSchema })

export const UpdaterInstall = Rpc.make("UpdaterInstall", { payload: noArgs, success: voidResult })

export const WslSubscribe = Rpc.make("WslSubscribe", { payload: noArgs, success: voidResult })

export const WslUnsubscribe = Rpc.make("WslUnsubscribe", { payload: noArgs, success: voidResult })

export const WslGetState = Rpc.make("WslGetState", { payload: noArgs, success: WslServersState })

export const WslProbeRuntime = Rpc.make("WslProbeRuntime", { payload: noArgs, success: voidResult })

export const WslRefreshDistros = Rpc.make("WslRefreshDistros", { payload: noArgs, success: voidResult })

export const WslInstallWsl = Rpc.make("WslInstallWsl", { payload: noArgs, success: voidResult })

export const WslInstallDistro = Rpc.make("WslInstallDistro", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const WslProbeAddable = Rpc.make("WslProbeAddable", {
  payload: Schema.Tuple([Schema.Array(Schema.String)]),
  success: voidResult,
})

export const WslInstallOpencode = Rpc.make("WslInstallOpencode", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const WslOpenTerminal = Rpc.make("WslOpenTerminal", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const WslAddServer = Rpc.make("WslAddServer", {
  payload: Schema.Tuple([Schema.String]),
  success: WslServerConfig,
})

export const WslRemoveServer = Rpc.make("WslRemoveServer", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const WslStartServer = Rpc.make("WslStartServer", {
  payload: Schema.Tuple([Schema.String]),
  success: voidResult,
})

export const AppDeepLink = Rpc.make("AppDeepLink", {
  payload: noArgs,
  success: Schema.Tuple([Schema.Array(Schema.String)]),
  stream: true,
})

export const MenuCommand = Rpc.make("MenuCommand", {
  payload: noArgs,
  success: Schema.Tuple([Schema.String]),
  stream: true,
})

export const UpdaterStateChanges = Rpc.make("UpdaterStateChanges", {
  payload: noArgs,
  success: Schema.Tuple([UpdaterStateSchema]),
  stream: true,
})

export const WslEvent = Rpc.make("WslEvent", {
  payload: noArgs,
  success: Schema.Tuple([WslServersEvent]),
  stream: true,
})

export const WindowFullscreenChanged = Rpc.make("WindowFullscreenChanged", {
  payload: noArgs,
  success: Schema.Tuple([Schema.Boolean]),
  stream: true,
})

export const WindowPinchZoomEnabledChanged = Rpc.make("WindowPinchZoomEnabledChanged", {
  payload: noArgs,
  success: Schema.Tuple([Schema.Boolean]),
  stream: true,
})

export const WindowZoomFactorChanged = Rpc.make("WindowZoomFactorChanged", {
  payload: noArgs,
  success: Schema.Tuple([Schema.Number]),
  stream: true,
})

export const IpcEventMessage = Schema.Union([
  Schema.Struct({ channel: Schema.Literal(AppDeepLink._tag), args: Schema.Tuple([Schema.Array(Schema.String)]) }),
  Schema.Struct({ channel: Schema.Literal(MenuCommand._tag), args: Schema.Tuple([Schema.String]) }),
  Schema.Struct({ channel: Schema.Literal(UpdaterStateChanges._tag), args: Schema.Tuple([UpdaterStateSchema]) }),
  Schema.Struct({ channel: Schema.Literal(WslEvent._tag), args: Schema.Tuple([WslServersEvent]) }),
  Schema.Struct({ channel: Schema.Literal(WindowFullscreenChanged._tag), args: Schema.Tuple([Schema.Boolean]) }),
  Schema.Struct({ channel: Schema.Literal(WindowPinchZoomEnabledChanged._tag), args: Schema.Tuple([Schema.Boolean]) }),
  Schema.Struct({ channel: Schema.Literal(WindowZoomFactorChanged._tag), args: Schema.Tuple([Schema.Number]) }),
])
export type IpcEventMessage = Schema.Schema.Type<typeof IpcEventMessage>

export const DesktopRpcs = RpcGroup.make(
  AppAwaitInitialization,
  AppConsumeInitialDeepLinks,
  AppGetDefaultServerUrl,
  AppSetDefaultServerUrl,
  AppIsFirstLaunchOnboardingPending,
  AppFinishFirstLaunchOnboarding,
  AppCheckAppExists,
  AppResolveAppPath,
  AppSetBackgroundColor,
  AppExportDebugLogs,
  AppSetForceFocus,
  AppRecordFatalRendererError,
  AppSetNativeTranslations,
  AppRelaunch,
  StorageGet,
  StorageSet,
  StorageDelete,
  StorageClear,
  StorageKeys,
  StorageLength,
  DraftsGet,
  DraftsSet,
  DraftsDelete,
  DraftsPutBlob,
  DraftsGetBlob,
  FilesOpenDirectoryPicker,
  FilesOpenFilePicker,
  FilesReadPickedFile,
  FilesReleasePickedFiles,
  FilesSaveFilePicker,
  FilesOpenExternal,
  FilesOpenLocalFile,
  FilesOpenPath,
  FilesRevealPath,
  FilesReadClipboardImage,
  WindowGetId,
  WindowGetFocused,
  WindowGetFullscreen,
  WindowSetFocus,
  WindowShow,
  WindowGetZoomFactor,
  WindowSetZoomFactor,
  WindowGetPinchZoomEnabled,
  WindowSetPinchZoomEnabled,
  WindowSetTitlebar,
  MenuRunAction,
  UpdaterSubscribe,
  UpdaterUnsubscribe,
  UpdaterCheck,
  UpdaterInstall,
  WslSubscribe,
  WslUnsubscribe,
  WslGetState,
  WslProbeRuntime,
  WslRefreshDistros,
  WslInstallWsl,
  WslInstallDistro,
  WslProbeAddable,
  WslInstallOpencode,
  WslOpenTerminal,
  WslAddServer,
  WslRemoveServer,
  WslStartServer,
  AppDeepLink,
  MenuCommand,
  UpdaterStateChanges,
  WslEvent,
  WindowFullscreenChanged,
  WindowPinchZoomEnabledChanged,
  WindowZoomFactorChanged,
)

export type DesktopRpcClient = RpcClient.FromGroup<typeof DesktopRpcs, RpcClientError.RpcClientError>

type AllRpcs = RpcGroup.Rpcs<typeof DesktopRpcs>
type EventRpcs =
  | typeof AppDeepLink
  | typeof MenuCommand
  | typeof UpdaterStateChanges
  | typeof WslEvent
  | typeof WindowFullscreenChanged
  | typeof WindowPinchZoomEnabledChanged
  | typeof WindowZoomFactorChanged
type SendRpcs = typeof AppRelaunch | typeof FilesOpenExternal | typeof FilesOpenLocalFile
type InvokeRpcs = Exclude<AllRpcs, EventRpcs | SendRpcs>
type Mutable<Value> =
  Value extends ReadonlyArray<unknown>
    ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
    : Value extends object
      ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
      : Value
type OptionalPayload<Request> = Mutable<Extract<Rpc.Payload<Request>, readonly [unknown]>[0]>
type InvokeArgs<Request> = Request extends typeof DraftsPutBlob
  ? [data: ArrayBuffer]
  : Request extends typeof FilesOpenDirectoryPicker | typeof FilesOpenFilePicker | typeof FilesSaveFilePicker
    ? [options?: OptionalPayload<Request>]
    : Request extends typeof FilesOpenPath
      ? [path: string, application?: string]
      : Mutable<Rpc.Payload<Request>>
type InvokeResult<Request> = Request extends typeof DraftsGetBlob
  ? ArrayBuffer | null
  : Request extends typeof FilesReadPickedFile
    ? ArrayBuffer
    : Request extends typeof FilesReadClipboardImage
      ? { buffer: ArrayBuffer; width: number; height: number } | null
      : Request extends typeof FilesOpenPath
        ? string | undefined
        : Mutable<Rpc.Success<Request>>

export type IpcInvoke = {
  [Request in InvokeRpcs as Request["_tag"]]: {
    args: InvokeArgs<Request>
    result: InvokeResult<Request>
  }
}
export type IpcSend = {
  [Request in SendRpcs as Request["_tag"]]: Mutable<Rpc.Payload<Request>>
}
export type IpcEvent = {
  [Request in EventRpcs as Request["_tag"]]: Mutable<Rpc.SuccessChunk<Request>>
}
export type IpcInvokeArgs<Channel extends keyof IpcInvoke> = IpcInvoke[Channel]["args"]
export type IpcInvokeResult<Channel extends keyof IpcInvoke> = IpcInvoke[Channel]["result"]
export type IpcInvokeMethod<Channel extends keyof IpcInvoke> = (
  ...args: IpcInvokeArgs<Channel>
) => Promise<IpcInvokeResult<Channel>>
export type IpcSendMethod<Channel extends keyof IpcSend> = (...args: IpcSend[Channel]) => void
export type IpcEventListener<Channel extends keyof IpcEvent> = (...args: IpcEvent[Channel]) => void
export type IpcEventSubscription<Channel extends keyof IpcEvent> = (listener: IpcEventListener<Channel>) => () => void
