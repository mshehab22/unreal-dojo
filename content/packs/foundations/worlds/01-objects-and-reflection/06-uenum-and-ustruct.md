---
id: f1-uenum-and-ustruct
title: UENUM and USTRUCT bring your own types into reflection
order: 6
kind: concept
difficulty: 2
patterns: []
skills: [reflection]
terms: [uenum, ustruct, generated-body, blueprintreadwrite, coding-standard]
prerequisites: [f1-training-dummy]
xp: 25
estimatedMinutes: 6
concepts:
  - A reflected enum is an enum class of uint8 with UENUM above it
  - UMETA gives each value a display name without renaming it
  - USTRUCT groups related values into one reflected type
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a target's state is a plain `enum class ETargetMode : uint8 { Idle, Up };` with no macro, and a field of that type has `UPROPERTY(EditAnywhere)`. What happens when you build?"
choices:
  - It builds, and Details shows a dropdown with Idle and Up
  - It builds, and Details shows a number box
  - The header tool stops, because a UPROPERTY cannot use an enum it knows nothing about
  - It builds, and the field is silently left out of Details
answerIndex: 2
explanation: Reflection can only describe a field whose type it knows, so the enum itself needs UENUM first.
```

# Card

Your own enums and structs can join reflection too, and then they work everywhere a built-in type does: Details panels, Blueprint pins, saving, and logs.

A reflected enum is an `enum class` with a `uint8` underlying type and `UENUM()` above it. Add `BlueprintType` inside the brackets so Blueprint can use it as a variable type. `UMETA(DisplayName = "Up")` after a value changes the label designers see while the C++ name stays `ETS_Raised`. This project starts every value with the enum's initials (ETS for a target state), so a value reads as belonging to its enum wherever it appears. Reflection can then turn a value into readable text for you: `UEnum::GetDisplayValueAsText(State)` returns the display name, with no switch statement to keep in sync.

A reflected struct is a value type with `USTRUCT()` above it and `GENERATED_BODY()` as its first line. Its name takes the `F` prefix. Fields inside that should be saved, edited, or reach Blueprint get their own UPROPERTY. Structs suit small bundles of data that travel together, such as the result of one round: score, hits, and time.

Neither one can hold functions that Blueprint calls; behavior stays on UObjects.

# Example

```cpp
// The states a yard gate moves through.
UENUM(BlueprintType)
enum class EDojoF1GateState : uint8
{
	EGS_Shut UMETA(DisplayName = "Closed"),
	EGS_Opening UMETA(DisplayName = "Opening"),
	EGS_Open UMETA(DisplayName = "Open")
};

// What one practice round produced, passed around as a single value.
USTRUCT(BlueprintType)
struct FDojoF1RoundResult
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Round")
	int32 Score = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Round")
	float Seconds = 0.f;
};
```

# Questions

```yaml
- id: enum-underlying-type
  type: fill-blank
  prompt: "A UENUM that Blueprint can use is declared as enum class EDojoF1Mode : ___."
  acceptedAnswers: [uint8]
  explanation: Blueprint stores enums as bytes, so a BlueprintType enum must use uint8.
- id: display-name
  type: multiple-choice
  prompt: "A value is declared as EGS_Shut UMETA(DisplayName = \"Closed\"). What does UEnum::GetDisplayValueAsText return for it?"
  choices: [EGS_Shut, Closed, EDojoF1GateState::EGS_Shut, "0"]
  answerIndex: 1
  explanation: The display name comes from UMETA, so designers read Closed while code keeps EGS_Shut.
- id: spot-struct-body
  type: spot-the-bug
  prompt: The header tool stops on this struct. Which line is wrong?
  code: |
    USTRUCT(BlueprintType)
    struct DojoF1RoundResult
    {
    	GENERATED_BODY()
    	UPROPERTY(EditAnywhere, Category = "Round")
    	int32 Score = 0;
    };
  bugLine: 2
  fix: Name the struct FDojoF1RoundResult, with the F prefix.
  explanation: The header tool checks the coding standard prefix on reflected types, and structs take F.
- id: struct-or-uobject
  type: multiple-choice
  prompt: "Which of these is the best fit for a USTRUCT rather than a UObject class?"
  choices:
    - A score summary of three numbers returned from a function
    - A target that reacts when it is hit
    - A manager that spawns enemies every few seconds
  answerIndex: 0
  explanation: A struct is a plain value; anything with behavior or a lifetime of its own belongs in a UObject class.
- id: explain-umeta
  type: explain-in-one-sentence
  prompt: In one sentence, say what reflection gives you when you mark an enum with UENUM.
  modelAnswer: The engine learns the enum's values and their display names, so it can show them in Details and Blueprint and turn any value into readable text without a hand-written switch.
  rubric:
    - Mentions editor or Blueprint use of the values
    - Mentions turning a value into a name or text
  explanation: That is why a reflected enum label never drifts out of step with the enum.
```
