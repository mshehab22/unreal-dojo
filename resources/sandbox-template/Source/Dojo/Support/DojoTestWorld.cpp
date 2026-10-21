#include "Support/DojoTestWorld.h"
#include "Engine/Engine.h"
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

	// Routes EndPlay to every actor and clears the begun-play flag, so destroying the world raises no warning.
	World->EndPlay(EEndPlayReason::LevelTransition);

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
		World->Tick(LEVELTICK_All, DeltaSeconds);
	}
}
