#pragma once

#include "CoreMinimal.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"

/**
 * Owns a throwaway game world for one automation test: creates it, spawns actors, ticks frames, and tears it all down when it goes out of scope.
 *
 * Two ways to get a world inside an editor-context test, and why this helper picks the second:
 * 1. Editor map: FAutomationEditorCommonUtils::CreateNewMap() from "Tests/AutomationEditorCommon.h" (needs UnrealEd). It replaces the editor's
 *    current map and is editor-only, so it is kept as a fallback for quests that truly need an editor map.
 * 2. Standalone game world: UWorld::CreateWorld plus GEngine->CreateNewWorldContext. No editor map, no game mode, works in the headless loop
 *    and in a live editor. This is what FDojoTestWorld wraps, the same route as CQTest's FActorTestSpawner.
 *
 * The world is marked as begun play, so spawned actors and newly registered components get BeginPlay right away. Not copyable (RAII).
 */
class DOJO_API FDojoTestWorld
{
public:
	/** Creates the world, its world context, and initializes actors for play. */
	FDojoTestWorld();

	/** Ends play on every actor, then destroys the world and its context. */
	~FDojoTestWorld();

	FDojoTestWorld(const FDojoTestWorld&) = delete;
	FDojoTestWorld& operator=(const FDojoTestWorld&) = delete;

	/** The world this helper owns. Valid for the helper's lifetime. */
	UWorld* GetWorld() const;

	/** Spawns an actor of the given class at the origin. Returns nullptr if spawning failed. */
	template<typename TActor>
	TActor* SpawnActor()
	{
		return World->SpawnActor<TActor>(FVector::ZeroVector, FRotator::ZeroRotator);
	}

	/** Creates, registers, and returns a component on Owner; BeginPlay runs on it immediately because the world has begun play. */
	template<typename TComponent>
	TComponent* AddComponent(AActor* Owner)
	{
		if (!IsValid(Owner)) return nullptr;

		TComponent* Component = NewObject<TComponent>(Owner);
		Owner->AddInstanceComponent(Component);
		Component->RegisterComponent();
		return Component;
	}

	/** Advances the world by FrameCount frames of DeltaSeconds each. */
	void Tick(int32 FrameCount, float DeltaSeconds = DefaultFrameSeconds);

	/** One frame at 60 frames per second. */
	static constexpr float DefaultFrameSeconds = 1.f / 60.f;

private:
	/** The owned world; rooted so garbage collection cannot take it mid-test. */
	UWorld* World = nullptr;
};
