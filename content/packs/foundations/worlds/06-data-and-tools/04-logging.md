---
id: f6-logging
title: Logging and on-screen messages
order: 4
kind: concept
difficulty: 2
patterns: []
skills: [debugging]
terms: [ue-log, log-category, on-screen-debug-message, console-command]
prerequisites: [f6-data-tables]
xp: 25
estimatedMinutes: 7
concepts:
  - UE_LOG writes to a category at a verbosity, and both can be filtered
  - Each system gets its own log category instead of LogTemp
  - On-screen messages are for live readouts, the log for a record
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: UE_LOG(LogTemp, Warning, TEXT(\"Spawned %s\"), Name); where Name is an FString. What goes wrong?"
choices:
  - Nothing, it prints the name
  - It needs *Name, because %s expects a character pointer, not an FString
  - Warnings cannot take arguments
  - LogTemp only accepts Log verbosity
answerIndex: 1
explanation: The format works like printf; an FString is passed as *Name, which gives its characters.
```

# Card

`UE_LOG(Category, Verbosity, TEXT("format"), Arguments...)` writes one line to the Output Log window and to the log file in the project's Saved/Logs folder. Three parts matter:

- **Category.** Every line belongs to a named category, such as `LogTemp`, `LogDojoSpawner`, or the engine's own `LogNet`. The Output Log can filter by category, and a console command can turn one up or down.
- **Verbosity.** From loudest to quietest: `Fatal` (stops the program), `Error`, `Warning`, `Display`, `Log`, `Verbose`, `VeryVerbose`. Errors are red and warnings yellow in the Output Log. Verbose lines are hidden unless the category is turned up.
- **Format.** It works like printf: `%d` for integers, `%f` for floats, and `%s` for text, which takes `*MyString` for an FString and `*MyName.ToString()` for an FName.

`LogTemp` is fine for a quick check you will delete. Code you keep gets its own **log category**, so its lines can be found and filtered:

- For one .cpp file: `DEFINE_LOG_CATEGORY_STATIC(LogDojoSpawner, Log, All);` near the top.
- For several files: `DECLARE_LOG_CATEGORY_EXTERN(LogDojoSpawner, Log, All);` in a header and `DEFINE_LOG_CATEGORY(LogDojoSpawner);` in one .cpp.

The second argument is the default verbosity shown, and the third is the most verbose level compiled in.

At run time, the console command `Log LogDojoSpawner Verbose` shows that category's verbose lines, and `Log LogDojoSpawner Off` hides it. Other console commands help too: `stat fps` and `stat unit` show frame cost.

For a value you want to watch while playing, such as speed or ammo, `GEngine->AddOnScreenDebugMessage(Key, Seconds, Color, Text)` prints over the game, like Blueprint's Print String. A fixed key replaces the previous message with that key instead of stacking a new one; -1 always adds a new one. Check `GEngine` before using it.

Log what a designer or tester needs to know (a missing row, an asset that failed to load), at a verbosity that says how bad it is. Do not log every frame at Log level: the log fills up and hides the line that mattered.

# Example

```cpp
DEFINE_LOG_CATEGORY_STATIC(LogDojoDoor, Log, All);

void ADojoDoor::Open()
{
	if (!IsValid(Key))
	{
		UE_LOG(LogDojoDoor, Warning, TEXT("%s has no key assigned and stays shut"), *GetName());
		return;
	}

	UE_LOG(LogDojoDoor, Verbose, TEXT("%s opens with %s"), *GetName(), *Key->GetName());
	if (GEngine) GEngine->AddOnScreenDebugMessage(1, 2.f, FColor::Green, TEXT("Door open"));
}
```

# Questions

```yaml
- id: fstring-arg
  type: fill-blank
  prompt: "To print an FString called Name with %s in UE_LOG, pass it as ___Name."
  acceptedAnswers: ["*"]
  explanation: The * operator gives the FString's characters, which is what %s expects.
- id: own-category
  type: multiple-choice
  prompt: "Why give a spawner its own log category instead of using LogTemp?"
  choices:
    - LogTemp lines are not saved to the log file
    - Its lines can be filtered and turned up or down on their own
    - Only custom categories can log warnings
  answerIndex: 1
  explanation: A category is a channel you can search for and control without touching other systems.
- id: spot-every-frame
  type: spot-the-bug
  prompt: The Output Log is unreadable within seconds of pressing Play. Which line causes it?
  code: |
    void ADojoFollower::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	UE_LOG(LogDojoFollower, Log, TEXT("Position %s"), *GetActorLocation().ToString());
    	MoveStep(DeltaSeconds);
    }
  bugLine: 4
  fix: Log at Verbose so it is hidden unless asked for, or show the value with a keyed on-screen message.
  explanation: A Log line every frame buries everything else in the log.
- id: screen-key
  type: multiple-choice
  prompt: "An on-screen speed readout stacks a new line every frame. What fixes it?"
  choices:
    - Pass a fixed key instead of -1
    - Use a shorter display time
    - Use UE_LOG instead
  answerIndex: 0
  explanation: A message with the same key replaces the previous one.
- id: explain-verbosity
  type: explain-in-one-sentence
  prompt: In one sentence, say what the verbosity of a log line is for.
  modelAnswer: It says how serious the line is, which sets its color and lets anyone hide quieter lines and see the ones that matter.
  rubric:
    - Mentions seriousness or level
    - Mentions filtering or hiding lines
  explanation: Verbosity is how a log stays readable.
```
