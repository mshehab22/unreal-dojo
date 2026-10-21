#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Quests/f4-boss-course-setup/DojoF4CourseDirector.h"
#include "Quests/f4-carrier/DojoF4Carrier.h"
#include "Quests/f4-fence/DojoF4Fence.h"
#include "Quests/f4-hit-counter/DojoF4HitCounterComponent.h"
#include "Quests/f4-registry/DojoF4RegistryEntryComponent.h"
#include "Quests/f4-registry/DojoF4TargetRegistry.h"
#include "Support/DojoTestWorld.h"

namespace DojoF4CourseTest
{
	/** Every piece of the course, wired the way a designer would. */
	struct FCourse
	{
		ADojoF4Carrier* Keeper = nullptr;
		ADojoF4Fence* Fence = nullptr;
		TArray<ADojoF1TrainingDummy*> Dummies;
		ADojoF4CourseDirector* Director = nullptr;
		UDojoF4TargetRegistry* Registry = nullptr;
	};

	/** Where the six dummies start; dummies 0 and 4 stand at the same distance from the origin. */
	const FVector DummyStarts[] = { FVector(-200.f, 0.f, 0.f), FVector(0.f, -500.f, 0.f), FVector(500.f, -500.f, 0.f), FVector(1000.f, -500.f, 0.f), FVector(200.f, 0.f, 0.f), FVector(1500.f, 0.f, 0.f) };

	/** Spawns a fence of 4 posts 300 apart at (0, 1000, 0), six dummies with a counter and a registry entry, the keeper, and the director. */
	FCourse SpawnCourse(FDojoTestWorld& TestWorld)
	{
		FCourse Course;
		UWorld* World = TestWorld.GetWorld();

		const FTransform FencePlace(FVector(0.f, 1000.f, 0.f));
		Course.Fence = World->SpawnActorDeferred<ADojoF4Fence>(ADojoF4Fence::StaticClass(), FencePlace);
		Course.Fence->PostCount = 4;
		Course.Fence->Spacing = 300.f;
		Course.Fence->FinishSpawning(FencePlace);

		for (const FVector& Start : DummyStarts)
		{
			ADojoF1TrainingDummy* Dummy = TestWorld.SpawnActor<ADojoF1TrainingDummy>();
			Dummy->SetActorLocation(Start);
			TestWorld.AddComponent<UDojoF4HitCounterComponent>(Dummy);
			TestWorld.AddComponent<UDojoF4RegistryEntryComponent>(Dummy);
			Course.Dummies.Add(Dummy);
		}

		Course.Keeper = TestWorld.SpawnActor<ADojoF4Carrier>();

		Course.Director = World->SpawnActorDeferred<ADojoF4CourseDirector>(ADojoF4CourseDirector::StaticClass(), FTransform::Identity);
		Course.Director->Keeper = Course.Keeper;
		Course.Director->Fence = Course.Fence;
		for (ADojoF1TrainingDummy* Dummy : Course.Dummies) Course.Director->Dummies.Add(Dummy);
		Course.Director->FinishSpawning(FTransform::Identity);

		Course.Registry = World->GetSubsystem<UDojoF4TargetRegistry>();
		return Course;
	}

	/** Moves the keeper and lets half a second pass, like a player walking there. */
	void WalkTo(FDojoTestWorld& TestWorld, FCourse& Course, const FVector& Location)
	{
		Course.Keeper->SetActorLocation(Location);
		TestWorld.Tick(30);
	}

	/** The counter on a dummy. */
	UDojoF4HitCounterComponent* CounterOf(AActor* Dummy)
	{
		return Dummy->FindComponentByClass<UDojoF4HitCounterComponent>();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_CourseSetup_TwoRoundsPlayAlike, "Dojo.F4.CourseSetup.TwoRoundsPlayAlike", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Plays the same setup and test run twice and checks the same dummies land on the same posts, the same finish time, and a full reset between. */
bool FDojo_F4_CourseSetup_TwoRoundsPlayAlike::RunTest(const FString& Parameters)
{
	using namespace DojoF4CourseTest;

	FDojoTestWorld TestWorld;
	FCourse Course = SpawnCourse(TestWorld);
	ADojoF4CourseDirector* Director = Course.Director;
	if (!TestNotNull(TEXT("The world has a registry"), Course.Registry)) return false;

	float FirstFinish = 0.f;
	for (int32 Round = 1; Round <= 2; ++Round)
	{
		const FString Prefix = FString::Printf(TEXT("Round %d: "), Round);

		TestTrue(Prefix + TEXT("running"), Director->IsRunning());
		TestEqual(Prefix + TEXT("every dummy is loose and registered"), Course.Registry->GetRegisteredCount(), 6);
		TestEqual(Prefix + TEXT("no post is filled"), Director->GetPlacedCount(), 0);
		TestEqual(Prefix + TEXT("the label shows the par"), Director->Label->Text.ToString(), FString(TEXT("PAR 60 s")));
		for (int32 Index = 0; Index < Course.Dummies.Num(); ++Index)
		{
			TestEqual(Prefix + TEXT("each dummy starts where it began"), Course.Dummies[Index]->GetActorLocation(), DummyStarts[Index]);
			TestEqual(Prefix + TEXT("each dummy's counter starts clear"), CounterOf(Course.Dummies[Index])->GetHits(), 0);
		}

		// From the origin, dummies 0 and 4 are equally near; the one registered first, dummy 0, must be picked.
		const int32 PickOrder[] = { -1, 1, 2, 3 };
		const int32 Expected[] = { 0, 1, 2, 3 };
		for (int32 Post = 0; Post < 4; ++Post)
		{
			WalkTo(TestWorld, Course, PickOrder[Post] < 0 ? FVector::ZeroVector : DummyStarts[PickOrder[Post]]);
			Director->PressInteract();
			TestTrue(Prefix + FString::Printf(TEXT("picked up dummy %d"), Expected[Post]), Course.Keeper->GetCargo() == Course.Dummies[Expected[Post]]);

			WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(Post));
			Director->PressInteract();
			TestTrue(Prefix + FString::Printf(TEXT("dummy %d placed on post %d"), Expected[Post], Post), Director->GetOccupant(Post) == Course.Dummies[Expected[Post]]);
			TestTrue(Prefix + TEXT("a placed dummy stands on its post"), Course.Dummies[Expected[Post]]->GetActorLocation().Equals(Course.Fence->GetPostLocation(Post), 0.01));
			TestFalse(Prefix + TEXT("a placed dummy leaves the registry"), Course.Registry->IsRegistered(Course.Dummies[Expected[Post]]));
		}

		for (int32 Post = 0; Post < 4; ++Post)
		{
			WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(Post));
			for (int32 Strike = 0; Strike < 3; ++Strike) Director->PressTest();
		}

		TestFalse(Prefix + TEXT("finished once every placed dummy is down"), Director->IsRunning());
		const float Finish = Director->GetFinishSeconds();
		TestEqual(Prefix + TEXT("the label shows the time under par"), Director->Label->Text.ToString(), FString::Printf(TEXT("READY %.1f s UNDER PAR"), Finish));
		if (Round == 1) FirstFinish = Finish;
		else TestEqual(TEXT("Round 2 takes exactly as long as round 1"), Finish, FirstFinish, 0.02f);

		Director->PressInteract();
		TestFalse(TEXT("E after the finish does nothing"), Course.Keeper->IsCarrying());

		Director->RestartCourse();
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_CourseSetup_RangesTiesAndPar, "Dojo.F4.CourseSetup.RangesTiesAndPar", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the pickup and place ranges at their edges, the lower post winning a tie, no testing before setup, no restart mid-round, and an over-par finish. */
bool FDojo_F4_CourseSetup_RangesTiesAndPar::RunTest(const FString& Parameters)
{
	using namespace DojoF4CourseTest;

	FDojoTestWorld TestWorld;
	FCourse Course = SpawnCourse(TestWorld);
	ADojoF4CourseDirector* Director = Course.Director;
	ADojoF1TrainingDummy* First = Course.Dummies[0];

	WalkTo(TestWorld, Course, DummyStarts[0] + FVector(0.f, 260.f, 0.f));
	Director->PressInteract();
	TestFalse(TEXT("260 away is out of the 250 pickup range"), Course.Keeper->IsCarrying());

	WalkTo(TestWorld, Course, DummyStarts[0] + FVector(0.f, 240.f, 0.f));
	Director->PressInteract();
	TestTrue(TEXT("240 away is inside the pickup range"), Course.Keeper->GetCargo() == First);

	WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(0) + FVector(0.f, -210.f, 0.f));
	Director->PressInteract();
	TestEqual(TEXT("210 from a post is out of the 200 place range"), Director->GetPlacedCount(), 0);
	TestTrue(TEXT("A dummy dropped away from posts stays loose"), Course.Registry->IsRegistered(First));

	Director->PressInteract();
	TestTrue(TEXT("The loose dummy can be picked up again"), Course.Keeper->GetCargo() == First);
	WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(0) + FVector(0.f, -190.f, 0.f));
	Director->PressInteract();
	TestTrue(TEXT("190 from a post is inside the place range"), Director->GetOccupant(0) == First);

	WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(0));
	Director->PressTest();
	TestEqual(TEXT("No test strikes before every post is filled"), CounterOf(First)->GetHits(), 0);

	// Halfway between posts 1 and 2: equally near, so the lower-numbered post wins.
	WalkTo(TestWorld, Course, DummyStarts[4]);
	Director->PressInteract();
	WalkTo(TestWorld, Course, (Course.Fence->GetPostLocation(1) + Course.Fence->GetPostLocation(2)) * 0.5);
	Director->PressInteract();
	TestTrue(TEXT("A tie between free posts goes to the lower number"), Director->GetOccupant(1) == Course.Dummies[4]);

	WalkTo(TestWorld, Course, DummyStarts[1]);
	Director->PressInteract();
	WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(1));
	Director->PressInteract();
	TestEqual(TEXT("A taken post does not take a second dummy"), Director->GetPlacedCount(), 2);

	Director->RestartCourse();
	TestEqual(TEXT("R does nothing during a round"), Director->GetPlacedCount(), 2);

	Director->PressInteract();
	WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(2));
	Director->PressInteract();
	WalkTo(TestWorld, Course, DummyStarts[2]);
	Director->PressInteract();
	WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(3));
	Director->PressInteract();
	TestEqual(TEXT("Every post filled"), Director->GetPlacedCount(), 4);

	// Dawdle past the 60 second par, then knock every placed dummy down.
	TestWorld.Tick(60 * 60);
	for (int32 Post = 0; Post < 4; ++Post)
	{
		WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(Post));
		for (int32 Strike = 0; Strike < 3; ++Strike) Director->PressTest();
	}

	TestFalse(TEXT("Finished"), Director->IsRunning());
	TestTrue(TEXT("Took longer than 60 seconds"), Director->GetFinishSeconds() > 60.f);
	TestTrue(TEXT("The label says over par"), Director->Label->Text.ToString().EndsWith(TEXT("OVER PAR")));

	const int32 HitsAfter = CounterOf(First)->GetHits();
	WalkTo(TestWorld, Course, Course.Fence->GetPostLocation(0));
	Director->PressTest();
	TestEqual(TEXT("T after the finish does nothing"), CounterOf(First)->GetHits(), HitsAfter);

	return true;
}

#endif
