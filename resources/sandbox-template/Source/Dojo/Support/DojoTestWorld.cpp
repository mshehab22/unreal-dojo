#include "Support/DojoTestWorld.h"
#include "Engine/Engine.h"
#include "EngineUtils.h"
#include "UObject/Package.h"

FDojoTestWorld::FDojoTestWorld()
{
	const FName WorldName = MakeUniqueObjectName(nullptr, UWorld::StaticClass(), TEXT("DojoTestWorld"));
	FWorldContext& WorldContext = GEngine->CreateNewWorldContext(EWorldType::Game);

	World = UWorld::CreateWorld(EWorldType::Game, false, WorldName, GetTransientPackage());
	check(World);
	WorldContext.SetCurrentWorld(World);

	World->InitializeActorsForPlay(FURL());

	// No game mode exists to start play, so begin play on the world directly; actors spawned from here on get BeginPlay as they spawn.
	World->BeginPlay();
	World->SetBegunPlay(true);
}

FDojoTestWorld::~FDojoTestWorld()
{
	if (!World) return;

	// Ends play by hand instead of UWorld::EndPlay, which older engines may lack. Clearing begun-play stops CleanupWorld from warning.
	for (AActor* Actor : FActorRange(World))
	{
		if (IsValid(Actor)) Actor->RouteEndPlay(EEndPlayReason::LevelTransition);
	}

	World->SetBegunPlay(false);

	GEngine->ShutdownWorldNetDriver(World);
	World->DestroyWorld(true);
	World->SetPhysicsScene(nullptr);
	GEngine->DestroyWorldContext(World);
	World->RemoveFromRoot();
	World = nullptr;
}

UWorld* FDojoTestWorld::GetWorld() const
{
	return World;
}

void FDojoTestWorld::Tick(int32 FrameCount, float DeltaSeconds)
{
	for (int32 Frame = 0; Frame < FrameCount; ++Frame)
	{
		// The timer manager ticks once per engine frame number, and only the engine loop advances it; without this, timers fire on the first frame only.
		++GFrameCounter;
		World->Tick(LEVELTICK_All, DeltaSeconds);
	}
}
