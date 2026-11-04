#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Quests/p19-boss-dusk/DojoP19DuskHunt.h"
#include "Quests/p19-firefly-meadow/DojoP19Meadow.h"
#include "Quests/p19-firefly-swarm/DojoP19Swarm.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP19DuskTest
{
	/** Spawns the champion far from the meadow. */
	AActor* SpawnChampion(FDojoTestWorld& TestWorld)
	{
		AActor* Champion = TestWorld.SpawnActor<ADojoTestActor>();
		if (Champion) Champion->SetActorLocation(FVector(0.f, 0.f, 10000.f));
		return Champion;
	}

	/** Spawns the hunt with the champion set before its BeginPlay, which starts round 1. */
	ADojoP19DuskHunt* SpawnHunt(FDojoTestWorld& TestWorld, AActor* Champion)
	{
		ADojoP19DuskHunt* Hunt = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP19DuskHunt>(ADojoP19DuskHunt::StaticClass(), FTransform::Identity);
		if (!Hunt) return nullptr;
		Hunt->Champion = Champion;
		Hunt->FinishSpawning(FTransform::Identity);
		return Hunt;
	}

	/** How many actors of a class stand in the world. */
	template<typename TActor>
	int32 CountActors(FDojoTestWorld& TestWorld)
	{
		int32 Count = 0;
		for (TActorIterator<TActor> Each(TestWorld.GetWorld()); Each; ++Each) Count++;
		return Count;
	}

	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, double Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}

	/** Every frame, moves the champion onto the oldest released firefly, until the round ends or Seconds more have passed. */
	void ChaseFireflies(FDojoTestWorld& TestWorld, ADojoP19DuskHunt* Hunt, AActor* Champion, float Seconds)
	{
		const double Until = TestWorld.GetWorld()->GetTimeSeconds() + Seconds;
		while (Hunt->IsRunning() && TestWorld.GetWorld()->GetTimeSeconds() < Until)
		{
			const TArray<FDojoP19FlyHandle> Released = Hunt->GetReleased();
			if (Released.Num() > 0) Champion->SetActorLocation(Hunt->GetMeadow()->GetPosition(Released[0]));
			TestWorld.Tick(1);
		}
	}

	/** The label's text now. */
	FString LabelOf(ADojoP19DuskHunt* Hunt)
	{
		return Hunt->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Dusk_AFullJarEndsTheRound, "Dojo.P19.Dusk.AFullJarEndsTheRound", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A champion who reaches every firefly as it appears fills the jar with the tenth, released at 19 seconds; each caught firefly joins the ambient swarm. */
bool FDojo_P19_Dusk_AFullJarEndsTheRound::RunTest(const FString& Parameters)
{
	using namespace DojoP19DuskTest;
	FDojoTestWorld TestWorld;

	AActor* Champion = SpawnChampion(TestWorld);
	ADojoP19DuskHunt* Hunt = SpawnHunt(TestWorld, Champion);
	if (!TestNotNull(TEXT("Champion spawned"), Champion) || !TestNotNull(TEXT("Hunt spawned"), Hunt)) return false;
	if (!TestNotNull(TEXT("The hunt set up a meadow"), Hunt->GetMeadow()) || !TestNotNull(TEXT("The hunt set up a swarm"), Hunt->GetSwarm())) return false;
	TestTrue(TEXT("Round 1 starts when play begins"), Hunt->IsRunning());
	TestEqual(TEXT("The ambient swarm starts with 2000 fireflies"), Hunt->GetSwarm()->GetFireflyCount(), 2000);

	TickUntil(TestWorld, 0.9f);
	TestEqual(TEXT("Nothing is released before 1 second"), Hunt->GetReleased().Num(), 0);
	TickUntil(TestWorld, 1.1f);
	TestEqual(TEXT("The first firefly is released at 1 second"), Hunt->GetReleased().Num(), 1);

	ChaseFireflies(TestWorld, Hunt, Champion, 30.f);
	TestFalse(TEXT("The round is over"), Hunt->IsRunning());
	TestEqual(TEXT("Ten fireflies were caught"), Hunt->GetCaughtCount(), 10);
	TestEqual(TEXT("None was missed"), Hunt->GetMissedCount(), 0);
	TestTrue(TEXT("The label shows the full jar"), LabelOf(Hunt).StartsWith(TEXT("JAR FULL in 19.")));
	TestEqual(TEXT("Every caught firefly joined the ambient swarm"), Hunt->GetSwarm()->GetFireflyCount(), 2010);
	TestEqual(TEXT("No catchable firefly is left in the meadow"), Hunt->GetMeadow()->GetFireflyCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Dusk_DuskCountsTheMissed, "Dojo.P19.Dusk.DuskCountsTheMissed", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A champion who never comes near catches nothing; at 60 seconds dusk falls with the 27 fireflies that faded by then counted as missed. */
bool FDojo_P19_Dusk_DuskCountsTheMissed::RunTest(const FString& Parameters)
{
	using namespace DojoP19DuskTest;
	FDojoTestWorld TestWorld;

	AActor* Champion = SpawnChampion(TestWorld);
	ADojoP19DuskHunt* Hunt = SpawnHunt(TestWorld, Champion);
	if (!TestNotNull(TEXT("Hunt spawned"), Hunt) || !TestNotNull(TEXT("The hunt set up a meadow"), Hunt->GetMeadow())) return false;

	TickUntil(TestWorld, 8.f);
	TestEqual(TEXT("At 8 seconds the first firefly, released at 1 with 6.5 seconds to live, has faded"), Hunt->GetMissedCount(), 1);
	TestTrue(TEXT("The round still runs"), Hunt->IsRunning());

	TickUntil(TestWorld, 61.f);
	TestFalse(TEXT("Dusk ended the round"), Hunt->IsRunning());
	TestEqual(TEXT("Nothing was caught"), Hunt->GetCaughtCount(), 0);
	TestEqual(TEXT("The fireflies released from 1 to 53 seconds faded before dusk"), Hunt->GetMissedCount(), 27);
	TestEqual(TEXT("The label shows dusk"), LabelOf(Hunt), FString(TEXT("DUSK: 0 caught, 27 missed")));
	TestEqual(TEXT("The swarm kept its 2000"), Hunt->GetSwarm()->GetFireflyCount(), 2000);
	TestEqual(TEXT("The three released at 55, 57, and 59 seconds are still drifting"), Hunt->GetReleased().Num(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Dusk_TwoRoundsPlayAlike, "Dojo.P19.Dusk.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** R starts round 2 only after round 1 ends; round 2 starts with zeroed counts, releases its first firefly at the same spot, and fills the jar the same way. */
bool FDojo_P19_Dusk_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoP19DuskTest;
	FDojoTestWorld TestWorld;

	AActor* Champion = SpawnChampion(TestWorld);
	ADojoP19DuskHunt* Hunt = SpawnHunt(TestWorld, Champion);
	if (!TestNotNull(TEXT("Hunt spawned"), Hunt) || !TestNotNull(TEXT("The hunt set up a meadow"), Hunt->GetMeadow())) return false;

	TestFalse(TEXT("R does nothing while round 1 runs"), Hunt->StartRound());
	TickUntil(TestWorld, 1.1f);
	const FVector FirstSpotOfRoundOne = Hunt->GetMeadow()->GetPosition(Hunt->GetReleased()[0]);
	ChaseFireflies(TestWorld, Hunt, Champion, 30.f);
	TestEqual(TEXT("Round 1 fills the jar"), Hunt->GetCaughtCount(), 10);

	Champion->SetActorLocation(FVector(0.f, 0.f, 10000.f));
	const double RoundTwoStart = TestWorld.GetWorld()->GetTimeSeconds();
	TestTrue(TEXT("R starts round 2 after round 1 ended"), Hunt->StartRound());
	TestEqual(TEXT("Round 2 starts with nothing caught"), Hunt->GetCaughtCount(), 0);
	TestEqual(TEXT("And nothing missed"), Hunt->GetMissedCount(), 0);
	TestEqual(TEXT("And no firefly released yet"), Hunt->GetReleased().Num(), 0);

	TickUntil(TestWorld, RoundTwoStart + 1.1f);
	if (!TestEqual(TEXT("Round 2 releases its first firefly after 1 second"), Hunt->GetReleased().Num(), 1)) return false;
	const FVector FirstSpotOfRoundTwo = Hunt->GetMeadow()->GetPosition(Hunt->GetReleased()[0]);
	TestTrue(TEXT("At the same spot as round 1's first"), FirstSpotOfRoundTwo.Equals(FirstSpotOfRoundOne, 1.f));

	ChaseFireflies(TestWorld, Hunt, Champion, 30.f);
	TestFalse(TEXT("Round 2 is over"), Hunt->IsRunning());
	TestEqual(TEXT("Round 2 fills the jar too"), Hunt->GetCaughtCount(), 10);
	TestTrue(TEXT("The label shows the full jar"), LabelOf(Hunt).StartsWith(TEXT("JAR FULL in 19.")));
	TestEqual(TEXT("Both rounds' catches joined the swarm"), Hunt->GetSwarm()->GetFireflyCount(), 2020);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Dusk_NoFireflyIsAnActor, "Dojo.P19.Dusk.NoFireflyIsAnActor", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Thirty releases and ten catches spawn no actor at all: the swarm, the meadow, and the hunt are the only actors the hunt brings. */
bool FDojo_P19_Dusk_NoFireflyIsAnActor::RunTest(const FString& Parameters)
{
	using namespace DojoP19DuskTest;
	int32 Spawned = 0;
	FDojoTestWorld TestWorld;

	AActor* Champion = SpawnChampion(TestWorld);
	ADojoP19DuskHunt* Hunt = SpawnHunt(TestWorld, Champion);
	if (!TestNotNull(TEXT("Hunt spawned"), Hunt)) return false;
	TestEqual(TEXT("One swarm"), CountActors<ADojoP19Swarm>(TestWorld), 1);
	TestEqual(TEXT("One meadow"), CountActors<ADojoP19Meadow>(TestWorld), 1);

	TestWorld.GetWorld()->AddOnActorSpawnedHandler(FOnActorSpawned::FDelegate::CreateLambda([&Spawned](AActor*)
	{
		Spawned++;
	}));

	ChaseFireflies(TestWorld, Hunt, Champion, 30.f);
	TestEqual(TEXT("The jar filled"), Hunt->GetCaughtCount(), 10);
	TestTrue(TEXT("R starts round 2"), Hunt->StartRound());
	TickUntil(TestWorld, TestWorld.GetWorld()->GetTimeSeconds() + 61.f);
	TestFalse(TEXT("Round 2 has ended"), Hunt->IsRunning());
	TestEqual(TEXT("No actor was spawned during either round"), Spawned, 0);

	return true;
}

#endif
