// Quest test: sample-health (template proof). Proves the sandbox builds, the test world helper works, and the report reaches the app.
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Kismet/GameplayStatics.h"
#include "Quests/SampleHealth/SampleHealthComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Sample_Health_TakesDamage, "Dojo.Sample.Health.TakesDamage", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spawns an actor with a health component, applies damage through the engine's damage path, and checks health and death. */
bool FDojo_Sample_Health_TakesDamage::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Target = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Target actor spawned"), Target)) return false;

	USampleHealthComponent* Health = TestWorld.AddComponent<USampleHealthComponent>(Target);
	if (!TestNotNull(TEXT("Health component added"), Health)) return false;

	TestEqual(TEXT("Health starts full"), Health->GetHealth(), 100.f);

	UGameplayStatics::ApplyDamage(Target, 30.f, nullptr, nullptr, nullptr);
	TestEqual(TEXT("Health after 30 damage"), Health->GetHealth(), 70.f);
	TestFalse(TEXT("Alive after 30 damage"), Health->IsDead());

	UGameplayStatics::ApplyDamage(Target, 500.f, nullptr, nullptr, nullptr);
	TestEqual(TEXT("Health clamps at zero"), Health->GetHealth(), 0.f);
	TestTrue(TEXT("Dead at zero health"), Health->IsDead());

	return true;
}

#endif
