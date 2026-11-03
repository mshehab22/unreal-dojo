#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "GameFramework/DefaultPawn.h"
#include "Quests/s6-boss-night-shift/DojoS6GuardController.h"
#include "Quests/s6-boss-night-shift/DojoS6ShiftDirector.h"
#include "Quests/s6-walk-beat/DojoS6Guard.h"
#include "Quests/s6-walk-beat/DojoS6TreeKit.h"
#include "Support/DojoTestWorld.h"

namespace DojoS6NightShiftTest
{
	/** Ticks one frame at a time until the board contains Wanted, for at most MaxSeconds; returns whether it did. */
	bool TickUntilBoardHas(FDojoTestWorld& TestWorld, const ADojoS6ShiftDirector* Director, const TCHAR* Wanted, float MaxSeconds)
	{
		const int32 FrameCount = FMath::CeilToInt(MaxSeconds / FDojoTestWorld::DefaultFrameSeconds);

		for (int32 Frame = 0; Frame < FrameCount; ++Frame)
		{
			if (Director->GetBoardText().Contains(Wanted))
			{
				return true;
			}

			TestWorld.Tick(1);
		}

		return Director->GetBoardText().Contains(Wanted);
	}

	/** Spawns the thief, then a director that uses it, so round 1 starts with the thief in place. */
	ADojoS6ShiftDirector* StartShift(FDojoTestWorld& TestWorld, APawn*& OutThief)
	{
		UWorld* World = TestWorld.GetWorld();
		OutThief = World->SpawnActor<ADefaultPawn>(FVector(-1500.f, 0.f, 0.f), FRotator::ZeroRotator);

		ADojoS6ShiftDirector* Director = World->SpawnActorDeferred<ADojoS6ShiftDirector>(ADojoS6ShiftDirector::StaticClass(), FTransform::Identity);
		Director->Thief = OutThief;
		Director->FinishSpawning(FTransform::Identity);
		return Director;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S6_NightShift_TwoRounds, "Dojo.S6.NightShift.TwoRounds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays round 1 (a pebble draws the guard, the guard sees the thief and catches it) and round 2 (the thief reaches the vault unseen). */
bool FDojo_S6_NightShift_TwoRounds::RunTest(const FString& Parameters)
{
	using namespace DojoS6NightShiftTest;

	FDojoTestWorld TestWorld;
	if (!TestTrue(TEXT("The test world has an AI system"), FDojoS6TreeKit::EnableAI(TestWorld.GetWorld()))) return false;
	APawn* Thief = nullptr;
	ADojoS6ShiftDirector* Director = StartShift(TestWorld, Thief);
	if (!TestNotNull(TEXT("Thief spawned"), Thief)) return false;
	if (!TestNotNull(TEXT("Director spawned"), Director)) return false;

	ADojoS6Guard* FirstGuard = Director->GetGuard();
	if (!TestNotNull(TEXT("Round 1 spawned a guard"), FirstGuard)) return false;
	TestTrue(TEXT("The guard is run by the guard controller"), Cast<ADojoS6GuardController>(FirstGuard->GetController()) != nullptr);
	TestTrue(TEXT("Round 1 runs"), Director->IsRunning());
	TestEqual(TEXT("The board starts calm"), Director->GetBoardText(), FString(TEXT("Guard: on patrol")));

	TestWorld.Tick(60);
	const float FirstLegX = FirstGuard->GetActorLocation().X;
	TestTrue(TEXT("The guard walks its beat east, about 300 units a second"), FirstLegX > 240.f && FirstLegX < 360.f);
	TestEqual(TEXT("A thief out of range is not noticed"), Director->GetBoardText(), FString(TEXT("Guard: on patrol")));

	Director->PressRestart();
	TestTrue(TEXT("R does nothing while a round runs"), Director->GetGuard() == FirstGuard && Director->IsRunning());

	Director->ThrowPebble();
	TestTrue(TEXT("The guard hears the pebble land behind it"), TickUntilBoardHas(TestWorld, Director, TEXT("Guard: searching"), 1.5f));

	const float HeardAtX = FirstGuard->GetActorLocation().X;
	TestWorld.Tick(90);
	TestTrue(TEXT("The guard leaves its beat and walks west toward the noise"), FirstGuard->GetActorLocation().X < HeardAtX - 150.f);

	Thief->SetActorLocation(FirstGuard->GetActorLocation() + FVector(600.f, 0.f, 0.f), false, nullptr, ETeleportType::TeleportPhysics);
	TestTrue(TEXT("The guard sees the thief in front of it"), TickUntilBoardHas(TestWorld, Director, TEXT("Guard: chasing"), 2.f));
	TestTrue(TEXT("The guard catches the thief"), TickUntilBoardHas(TestWorld, Director, TEXT("CAUGHT in "), 3.f));
	TestFalse(TEXT("The catch ends round 1"), Director->IsRunning());

	const FString FinalBoard = Director->GetBoardText();
	Director->ThrowPebble();
	TestWorld.Tick(30);
	TestEqual(TEXT("A pebble after the finale changes nothing"), Director->GetBoardText(), FinalBoard);

	Director->PressRestart();
	ADojoS6Guard* SecondGuard = Director->GetGuard();
	if (!TestNotNull(TEXT("Round 2 spawned a guard"), SecondGuard)) return false;
	TestTrue(TEXT("Round 2 has a fresh guard"), SecondGuard != FirstGuard);
	TestTrue(TEXT("Round 2 runs"), Director->IsRunning());
	TestEqual(TEXT("Round 2 starts with a calm board and no result"), Director->GetBoardText(), FString(TEXT("Guard: on patrol")));
	TestTrue(TEXT("The new guard stands at the post"), SecondGuard->GetActorLocation().Equals(FVector::ZeroVector, 1.f));
	TestTrue(TEXT("The thief is back at its start"), Thief->GetActorLocation().Equals(FVector(-1500.f, 0.f, 0.f), 1.f));

	TestWorld.Tick(60);
	const float SecondLegX = SecondGuard->GetActorLocation().X;
	TestTrue(TEXT("Round 2's guard walks the same beat as round 1's"), FMath::IsNearlyEqual(SecondLegX, FirstLegX, 20.f));

	Thief->SetActorLocation(Director->VaultLocation, false, nullptr, ETeleportType::TeleportPhysics);
	TestTrue(TEXT("The thief opens the vault unseen"), TickUntilBoardHas(TestWorld, Director, TEXT("VAULT OPEN in 1.0 s"), 0.2f));
	TestFalse(TEXT("The vault ends round 2"), Director->IsRunning());
	TestTrue(TEXT("The guard never saw the thief in round 2"), Director->GetBoardText().StartsWith(TEXT("Guard: on patrol")));

	return true;
}

#endif
