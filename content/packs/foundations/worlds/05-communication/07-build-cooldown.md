---
id: f5-cooldown
title: A cooldown component on a timer
order: 7
kind: build
scaffold: stub
difficulty: 3
patterns: [component]
skills: [communication, time]
terms: [timer-manager, timer-handle, actor-component, blueprintassignable, endplay]
prerequisites: [f5-timers]
xp: 80
estimatedMinutes: 20
concepts:
  - A timer holds the waiting, so nothing ticks
  - A refused start must not restart a running timer
---

# Brief

When you press Play and run `ke * TryStart` twice in a row, the first starts a 1.2 second cooldown and the second is refused without restarting it; 1.2 seconds after the first, the cooldown is ready again and says so.

The declarations are given; every body is yours. This is the cooldown from World 1's dash breakdown, as a component any ability or device can wear:

- `TryStart` starts the cooldown and returns true when it is ready; while cooling it returns false and changes nothing.
- `IsReady`, `GetRemaining` (0 when ready), and `GetReadyCount` answer questions.
- When a cooldown finishes, the count rises and `OnReady` broadcasts.
- Leaving play clears the timer, so it never fires for a component that is gone.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

## See it in the editor

Add a Dojo F5 Cooldown component to any actor. Press Play, eject with F8, select the component, and run `ke * TryStart`: Is Ready stays false for 1.2 seconds. Run `ke * TryStart` again mid-cooldown and watch the remaining time keep counting down instead of jumping back. Bind to On Ready in the actor's Blueprint and print when it fires.

# Files

## DojoF5CooldownComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoF5CooldownComponent.generated.h"

/** Broadcast when a cooldown finishes. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoF5OnCooldownReady);

/** A reusable cooldown on a timer: start it, ask whether it is ready, and hear when it is. Any ability or device can wear one. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoF5CooldownComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; the timer does the waiting. */
	UDojoF5CooldownComponent();

	/** Seconds from a start until ready again. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Cooldown", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 1.2f;

	/** Fires each time a cooldown finishes. */
	UPROPERTY(BlueprintAssignable, Category = "Cooldown")
	FDojoF5OnCooldownReady OnReady;

	/** Starts the cooldown and returns true when ready; returns false and changes nothing while cooling. */
	UFUNCTION(BlueprintCallable, Category = "Cooldown")
	bool TryStart();

	/** True when no cooldown is running. */
	UFUNCTION(BlueprintPure, Category = "Cooldown")
	bool IsReady() const;

	/** Seconds until ready, or 0 when ready. */
	UFUNCTION(BlueprintPure, Category = "Cooldown")
	float GetRemaining() const;

	/** How many cooldowns have finished. */
	UFUNCTION(BlueprintPure, Category = "Cooldown")
	int32 GetReadyCount() const;

protected:
	/** Clears the timer so it never fires for a component that has left play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts the finished cooldown and broadcasts OnReady. */
	void HandleReady();

	FTimerHandle CooldownTimer;

	int32 ReadyCount = 0;
};
```

## DojoF5CooldownComponent.cpp

```cpp
#include "DojoF5CooldownComponent.h"

#include "Engine/World.h"
#include "TimerManager.h"

UDojoF5CooldownComponent::UDojoF5CooldownComponent()
{
}

bool UDojoF5CooldownComponent::TryStart()
{
	return false;
}

bool UDojoF5CooldownComponent::IsReady() const
{
	return true;
}

float UDojoF5CooldownComponent::GetRemaining() const
{
	return 0.f;
}

int32 UDojoF5CooldownComponent::GetReadyCount() const
{
	return 0;
}

void UDojoF5CooldownComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

void UDojoF5CooldownComponent::HandleReady()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/f5-cooldown/DojoF5CooldownComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Cooldown_RefusesWithoutRestarting, "Dojo.F5.Cooldown.RefusesWithoutRestarting", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Starts a 1.2 second cooldown, tries again halfway, and checks the refusal leaves the remaining time alone. */
bool FDojo_F5_Cooldown_RefusesWithoutRestarting::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoF5CooldownComponent* Cooldown = TestWorld.AddComponent<UDojoF5CooldownComponent>(Owner);
	if (!TestNotNull(TEXT("Cooldown added"), Cooldown)) return false;

	TestEqual(TEXT("The cooldown defaults to 1.2 seconds"), Cooldown->CooldownSeconds, 1.2f);
	TestTrue(TEXT("Ready before any start"), Cooldown->IsReady());
	TestEqual(TEXT("Nothing remains before any start"), Cooldown->GetRemaining(), 0.f);

	TestTrue(TEXT("The first start is accepted"), Cooldown->TryStart());
	TestFalse(TEXT("Cooling after the start"), Cooldown->IsReady());

	TestWorld.Tick(36);
	TestEqual(TEXT("About 0.6 seconds remain halfway"), Cooldown->GetRemaining(), 0.6f, 0.03f);

	TestFalse(TEXT("A start while cooling is refused"), Cooldown->TryStart());
	TestEqual(TEXT("The refusal does not restart the cooldown"), Cooldown->GetRemaining(), 0.6f, 0.03f);

	TestWorld.Tick(40);
	TestTrue(TEXT("Ready after 1.2 seconds in all"), Cooldown->IsReady());
	TestEqual(TEXT("One cooldown finished"), Cooldown->GetReadyCount(), 1);
	TestTrue(TEXT("A start is accepted again"), Cooldown->TryStart());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Cooldown_ClearedOnEndPlay, "Dojo.F5.Cooldown.ClearedOnEndPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the owner mid-cooldown and checks the timer never fires for the component afterwards. */
bool FDojo_F5_Cooldown_ClearedOnEndPlay::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoF5CooldownComponent* Cooldown = TestWorld.AddComponent<UDojoF5CooldownComponent>(Owner);
	if (!TestNotNull(TEXT("Cooldown added"), Cooldown)) return false;

	Cooldown->TryStart();
	TestWorld.Tick(30);
	Owner->Destroy();

	// The memory stays until garbage collection, which these ticks never run, so the count can still be read here.
	TestWorld.Tick(120);
	TestEqual(TEXT("The cleared timer never fired"), Cooldown->GetReadyCount(), 0);

	return true;
}

#endif
```

# Hints

- The failing assertion is about the time left after a refused start: work out what setting a timer on a handle that is already running does.
- TryStart must ask the timer manager whether this handle's timer is still active before setting it; the remaining time comes from the same manager and is negative when nothing runs.
- `FTimerManager::IsTimerActive`, `GetTimerRemaining`, `SetTimer`, and `ClearTimer` are in `TimerManager.h`; a component reaches the manager through `GetWorld()->GetTimerManager()`.

# Rubric

- TryStart checks IsTimerActive first and refuses without touching a running timer.
- The cooldown runs on one FTimerHandle with no Tick, and its length is the editable CooldownSeconds.
- HandleReady counts and broadcasts OnReady, a BlueprintAssignable event.
- GetRemaining never returns a negative number.
- EndPlay clears the timer before calling Super::EndPlay.
- The component knows nothing about its owner's class, so any actor can wear it.

# Alternative

The cooldown could store the game time of the last start and compare `GetWorld()->GetTimeSeconds()` against it in IsReady. That needs no timer and is cheap to ask, but nothing tells listeners the moment it becomes ready, so a HUD would have to poll it every frame. The timer version can broadcast OnReady exactly once, which is what an icon that lights up when the ability is back needs.
