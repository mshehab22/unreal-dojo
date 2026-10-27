// Curated data members of the engine classes that Dojo classes derive from, for the C4458 shadow check (A1170).
//
// Source: the UE 5.8.3 headers under `C:\Program Files\Epic Games\UE_5.8\Engine\Source\Runtime\`:
//   Engine\Classes\GameFramework\Actor.h (AActor), Pawn.h (APawn), Character.h (ACharacter),
//   Engine\Classes\Components\ActorComponent.h (UActorComponent), SceneComponent.h (USceneComponent),
//   CoreUObject\Public\UObject\UObjectBase.h (the data members UObject inherits from UObjectBase).
// Only data members are listed (any access, private ones too, statics too, editor-only ones too). MSVC checked on
// 2026-10-27 (cl /W4): C4458 fires for a parameter or local that hides a data member of the class or of any base,
// even a private base member; it does not fire for a name that matches a member function, nor for a lambda parameter.
// Names the UE headers do not declare as members are left out on purpose: `World` (AActor has GetWorld(), not a field)
// and `bActive` (UActorComponent has `bIsActive`).
//
// To refresh after an engine upgrade: read each class body in the header (nested structs excluded) and update the list.

/** The engine classes the check knows. */
export type EngineClassName = "UObject" | "AActor" | "APawn" | "ACharacter" | "UActorComponent" | "USceneComponent";

/** The engine class each one derives from, or undefined for the root. */
export const ENGINE_PARENT: Readonly<Record<EngineClassName, EngineClassName | undefined>> = {
	UObject: undefined,
	AActor: "UObject",
	APawn: "AActor",
	ACharacter: "APawn",
	UActorComponent: "UObject",
	USceneComponent: "UActorComponent",
};

/** Data members each engine class declares itself (inherited ones come from its parent's list). */
export const ENGINE_CLASS_MEMBERS: Readonly<Record<EngineClassName, readonly string[]>> = {
	UObject: ["ObjectFlags", "InternalIndex", "ClassPrivate", "NamePrivate", "OuterPrivate"],

	AActor: [
		"bNetTemporary", "bNetStartup", "bOnlyRelevantToOwner", "bAlwaysRelevant", "bReplicateMovement", "bCallPreReplication",
		"bCallPreReplicationForReplay", "bHidden", "bTearOff", "bForceNetAddressable", "LevelInstanceType", "LevelInstanceFlags",
		"bIsMainWorldOnly", "bIgnoreInPIE", "bForceDuplicateInPIE", "bExchangedRoles", "bNetLoadOnClient", "bNetUseOwnerRelevancy",
		"bRelevantForNetworkReplays", "bRelevantForLevelBounds", "bReplayRewindable", "bAllowTickBeforeBeginPlay",
		"bAutoDestroyWhenFinished", "bCanBeDamaged", "bBlockInput", "bCollideWhenPlacing", "bFindCameraComponentWhenViewTarget",
		"bGenerateOverlapEventsDuringLevelStreaming", "bIgnoresOriginShifting", "bEnableAutoLODGeneration", "bIsEditorOnlyActor",
		"bActorSeamlessTraveled", "bReplicates", "bCanBeInCluster", "bMigratingAsset", "bAllowReceiveTickEventOnDedicatedServer",
		"bNetCheckedInitialPhysicsState", "bReplicateUsingRegisteredSubObjectList", "bHasFinishedSpawning", "bActorInitialized",
		"bActorBeginningPlayFromLevelStreaming", "bTickFunctionsRegistered", "bHasDeferredComponentRegistration",
		"bRunningUserConstructionScript", "bHasPreRegisteredAllComponents", "bHasRegisteredAllComponents", "bActorEnableCollision",
		"bActorIsBeingDestroyed", "bActorWantsDestroyDuringBeginPlay", "ActorHasBegunPlay", "bActorIsBeingConstructed",
		"bActorIsPendingPostNetInit", "BeginPlayCallDepth", "bAsyncPhysicsTickEnabled", "UpdateOverlapsMethodDuringLevelStreaming",
		"DefaultUpdateOverlapsMethodDuringLevelStreaming", "RemoteRole", "ActorCategory", "InitialLifeSpan", "CustomTimeDilation",
		"RayTracingGroupId", "GridPlacement_DEPRECATED", "RuntimeGrid", "Owner", "IntermediateOwner", "NetDriverName", "Role",
		"NetDormancy", "SpawnCollisionHandlingMethod", "AutoReceiveInput", "InputPriority", "CreationTime", "InputComponent", "NetTag",
		"NetCullDistanceSquared", "NetUpdateFrequency", "MinNetUpdateFrequency", "NetPriority", "PhysicsReplicationMode",
		"LastRenderTime", "Instigator", "Children", "RootComponent", "PivotOffset", "TimerHandle_LifeSpanExpired", "HLODLayer",
		"ObjectsDetachedFromExternalPackage", "Layers", "ParentComponentActor_DEPRECATED", "ParentComponent", "ActorGuid",
		"ActorInstanceGuid", "ContentBundleGuid", "DataLayers", "DataLayerAssets", "PreEditChangeDataLayers", "ExternalDataLayerAsset",
		"CopyPasteId", "GroupActor", "SpriteScale", "HiddenEditorViews", "OnPackagingModeChanged", "ActorLabel", "FolderPath",
		"FolderGuid", "bHiddenEd", "bIsEditorPreviewActor", "bHiddenEdLayer", "bHiddenEdLevel", "bRunConstructionScriptOnDrag",
		"bDefaultOutlinerExpansionState", "bLockLocation", "bActorLabelEditable", "bEditable", "bListedInSceneOutliner",
		"bOptimizeBPComponentData", "bCanPlayFromHere", "bIsSpatiallyLoaded", "bHiddenEdTemporary",
		"bForceExternalActorLevelReferenceForPIE", "Tags", "OnTakeAnyDamage", "OnTakePointDamage", "OnTakeRadialDamage",
		"OnActorBeginOverlap", "OnActorEndOverlap", "OnBeginCursorOver", "OnEndCursorOver", "OnClicked", "OnReleased",
		"OnInputTouchBegin", "OnInputTouchEnd", "OnInputTouchEnter", "OnInputTouchLeave", "OnActorHit", "OnDestroyed", "OnEndPlay",
		"CurrentTransactionAnnotation", "bUsePercentageBasedScaling", "ReplicatedSubObjects", "ReplicatedComponentsInfo",
		"ReplicatedComponents", "OwnedComponents", "NativeConstructedComponentToPropertyMap", "InstanceComponents",
		"BlueprintCreatedComponents", "OnComponentsReplaced", "MakeNoiseDelegate", "ProcessEventDelegate", "PrimaryActorTick",
		"AttachmentReplication", "ReplicatedMovement",
	],

	APawn: [
		"bUseControllerRotationPitch", "bUseControllerRotationYaw", "bUseControllerRotationRoll", "bCanAffectNavigationGeneration",
		"bInputEnabled", "bProcessingOutsideWorldBounds", "bIsLocalViewTarget", "BaseEyeHeight", "AutoPossessPlayer", "AutoPossessAI",
		"RemoteViewPitch16", "RemoteViewPitch", "AIControllerClass", "OnPawnBeginPlay", "PlayerState", "LastHitBy", "Controller",
		"PreviousController", "AllowedYawError", "ReceiveControllerChangedDelegate", "ReceiveRestartedDelegate", "ControlInputVector",
		"LastControlInputVector", "OverrideInputComponentClass",
	],

	ACharacter: [
		"Mesh", "CharacterMovement", "CapsuleComponent", "ArrowComponent", "MeshComponentName", "CharacterMovementComponentName",
		"CapsuleComponentName", "BasedMovement", "ReplicatedBasedMovement", "ReplicatedServerLastTransformUpdateTimeStamp",
		"ReplayLastTransformUpdateTimeStamp", "BaseRotationOffset", "BaseTranslationOffset", "ReplicatedGravityDirection",
		"PreNetReceivedGravityDirection", "AnimRootMotionTranslationScale", "CrouchedEyeHeight", "bInBaseReplication", "bIsCrouched",
		"bProxyIsJumpForceApplied", "bPressedJump", "bClientUpdating", "bClientWasFalling", "bClientResimulateRootMotion",
		"bClientResimulateRootMotionSources", "bSimGravityDisabled", "bClientCheckEncroachmentOnNetUpdate", "bServerMoveIgnoreRootMotion",
		"bWasJumping", "bProxyIsCharacterMovementActive", "ReplicatedMovementMode", "JumpKeyHoldTime", "JumpForceTimeRemaining",
		"ProxyJumpForceStartedTime", "JumpMaxHoldTime", "JumpMaxCount", "JumpCurrentCount", "JumpCurrentCountPreJump",
		"NumActorOverlapEventsCounter", "OnReachedJumpApex", "LandedDelegate", "MovementModeChangedDelegate",
		"OnCharacterMovementUpdated", "SavedRootMotion", "ClientRootMotionParams", "RootMotionRepMoves", "RepRootMotion",
	],

	UActorComponent: [
		"PrimaryComponentTick", "ComponentTags", "AssetUserData", "AssetUserDataEditorOnly", "MarkedForEndOfFrameUpdateArrayIndex",
		"MarkedForEndOfFrameUpdateState", "bReadyForEarlyEndOfFrameUpdate", "bRenderStateUpdating", "UCSSerializationIndex",
		"RegistrationState", "bRegistered", "bRenderStateCreated", "bRenderStateRecreating", "bPhysicsStateCreated",
		"bCallAsyncPhysicsStateCreatedDelegate", "bNetAddressable", "bReplicateUsingRegisteredSubObjectList", "bReplicates",
		"bRenderStateDirty", "bRenderTransformDirty", "bRenderDynamicDataDirty", "bRenderInstancesDirty", "bRoutedPostRename",
		"bAutoRegister", "bAllowReregistration", "bTickInEditor", "bNeverNeedsRenderUpdate", "bAllowConcurrentTick",
		"bAllowAnyoneToDestroyMe", "bCreatedByConstructionScript_DEPRECATED", "bInstanceComponent_DEPRECATED", "bAutoActivate",
		"bIsActive", "bEditableWhenInherited", "bNavigationRelevant", "bCanEverAffectNavigation", "bWantsInitializeComponent",
		"bIsEditorOnly", "bIsVisualizationComponent", "bNeedsUCSSerializationIndexEvaluted", "bHasBeenCreated", "bHasBeenInitialized",
		"bIsReadyForReplication", "bHasBegunPlay", "bIsBeingDestroyed", "bTickFunctionsRegistered", "PhysicsStateAsyncCreationScene",
		"OwnerPrivate", "WorldPrivate", "bCanUseCachedOwner", "bMarkPendingKillOnPostLoad", "bIsNetStartupComponent",
		"bMarkedForPreEndOfFrameSync", "bAsyncPhysicsTickEnabled", "PhysicsStateAsyncCreationState", "bComponentTickEnabled",
		"bCallStopReplicationInEndPlay", "CreationMethod", "OnComponentActivated", "OnComponentDeactivated",
		"UCSModifiedProperties_DEPRECATED", "AllUCSModifiedPropertiesLock", "AllUCSModifiedProperties", "ComponentTemplateNameSuffix",
		"MarkRenderStateDirtyEvent", "GlobalCreatePhysicsDelegate", "GlobalDestroyPhysicsDelegate",
	],

	USceneComponent: [
		"CachedLevelCollection", "PhysicsVolume", "AttachParent", "AttachSocketName", "NetOldAttachSocketName", "AttachChildren",
		"ClientAttachedChildren", "NetOldAttachParent", "Bounds", "RelativeLocation", "RelativeRotation", "RelativeScale3D",
		"ComponentVelocity", "bComponentToWorldUpdated", "bSkipUpdateOverlaps", "bAbsoluteLocation", "bAbsoluteRotation",
		"bAbsoluteScale", "bVisible", "bShouldBeAttached", "bShouldSnapLocationWhenAttached", "bShouldSnapRotationWhenAttached",
		"bShouldSnapScaleWhenAttached", "bHiddenEdTemporary", "bShouldUpdatePhysicsVolume", "bHiddenInGame",
		"bBoundsChangeTriggersStreamingDataRebuild", "bUseAttachParentBound", "bComputeFastLocalBounds", "bComputeBoundsOnceForGame",
		"bComputedBoundsOnceForGame", "bIsNotRenderAttachmentRoot", "bDisableDetachmentUpdateOverlaps", "bWantsOnUpdateTransform",
		"bHasGroupedMoveThisFrame", "bNetUpdateTransform", "bNetUpdateAttachment", "SkipUpdateOverlapsOptimEnabled",
		"bVisualizeComponent", "Mobility", "DetailMode", "PhysicsVolumeChangedDelegate", "IsRootComponentChanged", "SpriteComponent",
		"TransformUpdated", "ScopedMovementStack", "WorldRotationCache", "RelativeRotationCache", "ComponentToWorld", "TransformHandle",
	],
};

/** Engine classes that derive from USceneComponent but are not listed above (their own members are not curated, the inherited ones are). */
const SCENE_COMPONENT_NAMES: ReadonlySet<string> = new Set([
	"UPrimitiveComponent", "UMeshComponent", "UStaticMeshComponent", "USkeletalMeshComponent", "UShapeComponent", "USphereComponent",
	"UBoxComponent", "UCapsuleComponent", "UArrowComponent", "UCameraComponent", "USpringArmComponent", "ULightComponent",
	"UPointLightComponent", "USpotLightComponent", "UAudioComponent", "UBillboardComponent", "UTextRenderComponent", "UWidgetComponent",
	"UChildActorComponent", "UParticleSystemComponent", "UNiagaraComponent", "UDecalComponent", "UInstancedStaticMeshComponent",
]);

/** The nearest curated engine class an engine base derives from, by the engine's naming convention and a short list of well-known classes. */
export function engineClassFor(baseName: string): EngineClassName | undefined
{
	if (baseName in ENGINE_CLASS_MEMBERS) return baseName as EngineClassName;
	if (baseName === "ADefaultPawn" || baseName === "ASpectatorPawn") return "APawn";
	if (SCENE_COMPONENT_NAMES.has(baseName)) return "USceneComponent";
	if (/^U\w*Component$/.test(baseName)) return "UActorComponent";
	if (/^A[A-Z]/.test(baseName)) return "AActor";
	if (/^U[A-Z]/.test(baseName)) return "UObject";

	return undefined;
}

/** Every data member of `engineClass` and of all its engine ancestors, mapped to the engine class that declares it (the nearest one wins). */
export function engineMemberOwners(engineClass: EngineClassName): Map<string, EngineClassName>
{
	const owners = new Map<string, EngineClassName>();

	for (let current: EngineClassName | undefined = engineClass; current !== undefined; current = ENGINE_PARENT[current])
	{
		for (const name of ENGINE_CLASS_MEMBERS[current]) if (!owners.has(name)) owners.set(name, current);
	}

	return owners;
}
