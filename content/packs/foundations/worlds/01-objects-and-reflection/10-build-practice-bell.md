---
id: f1-practice-bell
title: A bell whose ring Blueprint can restyle
order: 10
kind: build
scaffold: blank
difficulty: 3
patterns: []
skills: [reflection, blueprint-bridge]
terms: [blueprintnativeevent, blueprintcallable, blueprintpure, uclass, meta-specifier, ue-log]
prerequisites: [f1-score-keeper]
xp: 120
estimatedMinutes: 30
concepts:
  - A BlueprintNativeEvent gives C++ a default that Blueprint may replace
  - Game rules stay in C++ while the reaction is open to designers
---

# Brief

When you press Play and run `ke * Strike 50`, the label above the bell reads DONG 50% and the output log prints that the bell rang at volume 0.50; a Blueprint child of the bell can replace that reaction without touching C++.

Write `ADojoF1PracticeBell` from nothing. Split it into two jobs:

- The rule, which stays in C++: a strike softer than `MinimumForce` does nothing; any other strike counts one ring and sets the volume to the force divided by `FullVolumeForce`, never above 1.
- The reaction, which designers may restyle: by default, write DONG and the volume as a percentage into a floating label and log a line to the `LogDojo` category (declared in `Dojo.h`).

The tests use this public interface, so keep these names:

- `UFUNCTION(BlueprintCallable) void Strike(float Force);`
- `UFUNCTION(BlueprintPure) int32 GetRingCount() const;` and `float GetLastVolume() const;`
- `UPROPERTY(EditAnywhere) float MinimumForce = 20.f;` clamped at 0 or more, and `float FullVolumeForce = 100.f;` clamped at 1 or more, so the volume division can never divide by zero.
- `UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Label;` the floating text the default reaction writes, created in the constructor.
- `void Ring(float Volume)` as a BlueprintNativeEvent; its C++ default is the reaction.

Dependency direction: the bell owns its rule and its default reaction; whoever strikes it (the console, a dummy, a Blueprint) only calls `Strike` and never touches the reaction.

## See it in the editor

Place a `DojoF1PracticeBell` in a map with no training dummies (`ke *` would strike those too), press Play, and run `ke * Strike 10`: nothing happens. Run `ke * Strike 50`: the label reads DONG 50% and the output log shows the ring at 0.50. Then stop, right-click the class in the Content Browser, choose Create Blueprint Class Based on DojoF1PracticeBell, open it, and override Ring with a Print String of the volume. Place that Blueprint instead and strike it: the print appears instead of the label change, and the ring count still goes up, because the rule never left C++.

# Files

## DojoF1PracticeBell.h

```cpp
// Declare ADojoF1PracticeBell here.
```

## DojoF1PracticeBell.cpp

```cpp
// Define ADojoF1PracticeBell here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-practice-bell/DojoF1PracticeBell.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_PracticeBell_RingIsNativeEvent, "Dojo.F1.PracticeBell.RingIsNativeEvent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Asks reflection whether Ring is an event Blueprint can override and whether Strike is callable. */
bool FDojo_F1_PracticeBell_RingIsNativeEvent::RunTest(const FString& Parameters)
{
	const UFunction* RingFunction = ADojoF1PracticeBell::StaticClass()->FindFunctionByName(TEXT("Ring"));
	if (!TestNotNull(TEXT("Ring is a UFUNCTION"), RingFunction)) return false;
	TestTrue(TEXT("Ring can be overridden in Blueprint"), RingFunction->HasAnyFunctionFlags(FUNC_BlueprintEvent));
	TestTrue(TEXT("Ring has a C++ default body"), RingFunction->HasAnyFunctionFlags(FUNC_Native));

	const UFunction* StrikeFunction = ADojoF1PracticeBell::StaticClass()->FindFunctionByName(TEXT("Strike"));
	if (!TestNotNull(TEXT("Strike is a UFUNCTION"), StrikeFunction)) return false;
	TestTrue(TEXT("Strike is BlueprintCallable"), StrikeFunction->HasAnyFunctionFlags(FUNC_BlueprintCallable));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F1_PracticeBell_RingsAboveMinimum, "Dojo.F1.PracticeBell.RingsAboveMinimum", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Strikes the bell softly, then at half and double the full-volume force, and checks the count, the volume, and the default reaction's label. */
bool FDojo_F1_PracticeBell_RingsAboveMinimum::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF1PracticeBell* Bell = TestWorld.SpawnActor<ADojoF1PracticeBell>();
	if (!TestNotNull(TEXT("Bell spawned"), Bell)) return false;

	TestEqual(TEXT("MinimumForce defaults to 20"), Bell->MinimumForce, 20.f);
	TestEqual(TEXT("FullVolumeForce defaults to 100"), Bell->FullVolumeForce, 100.f);

	Bell->Strike(10.f);
	TestEqual(TEXT("A soft strike does not ring"), Bell->GetRingCount(), 0);

	Bell->Strike(50.f);
	TestEqual(TEXT("A strike at 50 rings once"), Bell->GetRingCount(), 1);
	TestEqual(TEXT("Half the full-volume force rings at half volume"), Bell->GetLastVolume(), 0.5f);
	if (!TestNotNull(TEXT("Bell has a label"), Bell->Label.Get())) return false;
	TestEqual(TEXT("The default reaction writes DONG 50%"), Bell->Label->Text.ToString(), FString(TEXT("DONG 50%")));

	Bell->Strike(200.f);
	TestEqual(TEXT("Rings again"), Bell->GetRingCount(), 2);
	TestEqual(TEXT("Volume never passes 1"), Bell->GetLastVolume(), 1.f);

	return true;
}

#endif
```

# Hints

- Decide which lines are the rule (they must run no matter what a Blueprint does) and which are the reaction (a Blueprint may replace them); only the reaction belongs in the event.
- The event needs the UFUNCTION specifier that pairs a Blueprint override with a C++ default, and the default body lives in a second function with a fixed suffix; Strike calls the event by its plain name.
- The function specifiers are listed in `UObject/ObjectMacros.h`, and the percentage text helper is a static function on `FText` in `Internationalization/Text.h`.

# Rubric

- Ring is a BlueprintNativeEvent with its default in Ring_Implementation, declared virtual.
- Strike calls Ring, never Ring_Implementation, so a Blueprint override is not bypassed.
- The counting and volume rule lives in Strike, so a Blueprint override cannot break it.
- MinimumForce and FullVolumeForce are editable, clamped properties with the given defaults.
- The default reaction logs to LogDojo and writes the label; the label component is made once in the constructor.
- Nothing ticks, and the bell knows nothing about who strikes it.

# Alternative

Ring could be a BlueprintImplementableEvent instead, with the label and log written in Strike before calling it. Then a Blueprint can only add to the reaction, never remove the default, and a bell with no Blueprint still shows DONG. That suits effects that must always happen. The native event chosen here hands the whole reaction to the designer, which is right when the default is only a placeholder; the cost is that a Blueprint that forgets to call the parent loses the label without any warning.
