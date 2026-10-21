---
id: f3-strings
title: FString, FName, FText, and the TEXT macro
order: 4
kind: concept
difficulty: 2
patterns: []
skills: [strings]
terms: [fstring, fname, ftext, text-macro]
prerequisites: [f3-tmap-tset-tqueue]
xp: 25
estimatedMinutes: 7
concepts:
  - FString is for building and changing text in code
  - FName is a fast, case-insensitive identifier
  - FText is what players read, formatted for their language and culture
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: `FName(TEXT(\"Ana\")) == FName(TEXT(\"ana\"))`. What is the result?"
choices:
  - false, because the letters differ
  - true, because FName comparison ignores case
  - It does not compile; FName has no == operator
  - It depends on the platform
answerIndex: 1
explanation: FName stores names in a shared table and compares them without regard to case.
```

# Card

Unreal has three string types, each for one job. Picking the right one avoids slow code and text that cannot be translated.

`FString` is an ordinary, changeable string for code: build it with `FString::Printf(TEXT("%d hits"), Hits)`, join with `+`, search, split, and print to the log with `*MyString`. Use it for log lines, file names, and work in progress.

`FName` is an identifier: a name stored once in a shared table, so copying and comparing it is as cheap as comparing two numbers. Comparison ignores case, so Ana and ana are the same name. Use it for keys in maps, socket names, tags, and anything compared often. `NAME_None` is the empty name.

`FText` is text a player reads. It can be translated, and it formats numbers, dates, and plurals for the reader's culture. Write it with `LOCTEXT` or `NSLOCTEXT` so translators can find it, and fill in values with `FText::Format` and named arguments such as `{Player}`. A designer can then reorder the sentence or translate it without touching code.

`TEXT("...")` makes a string literal in the engine's wide character type. It has nothing to do with translation; it is just the right kind of literal for FString, FName, and logging.

Convert with care: `FText::FromString` and `FText::FromName` make text that cannot be translated, so keep them for names and debug output; `ToString()` goes the other way.

# Example

```cpp
#define LOCTEXT_NAMESPACE "DojoF3Example"

void ADojoF3Example::Show(FName Lane, int32 Hits)
{
	// For the log: plain FString, never shown to players.
	UE_LOG(LogTemp, Log, TEXT("Lane %s took %d hits"), *Lane.ToString(), Hits);

	// For players: a translatable format with named arguments.
	FFormatNamedArguments Arguments;
	Arguments.Add(TEXT("Lane"), FText::FromName(Lane));
	Arguments.Add(TEXT("Hits"), FText::AsNumber(Hits));
	Label->SetText(FText::Format(LOCTEXT("LaneHits", "{Lane}: {Hits} hits"), Arguments));
}

#undef LOCTEXT_NAMESPACE
```

# Questions

```yaml
- id: pick-type
  type: multiple-choice
  prompt: "A map of player names to best scores is read many times a second. Which type should the key be?"
  choices: [FString, FName, FText]
  answerIndex: 1
  explanation: FName compares as cheaply as a number, which is what a map key does over and over.
- id: fill-format
  type: fill-blank
  prompt: "To fill {Player} and {Score} into translatable text, call FText::___ with named arguments."
  acceptedAnswers: [Format]
  explanation: FText::Format keeps the sentence translatable and formats numbers for the reader's culture.
- id: spot-text-macro
  type: spot-the-bug
  prompt: This compiles, but a translator can never find or change the greeting. Which line is the problem?
  code: |
    void ADojoF3Greeter::Greet()
    {
    	const FText Greeting = FText::FromString(TEXT("Welcome to the yard"));
    	Label->SetText(Greeting);
    }
  bugLine: 3
  fix: Write the greeting with LOCTEXT or NSLOCTEXT so it becomes a translatable text entry.
  explanation: FromString makes culture-invariant text; TEXT only makes a wide literal and has nothing to do with translation.
- id: text-macro-meaning
  type: multiple-choice
  prompt: "What does the TEXT macro do?"
  choices:
    - Marks a string for translation
    - Makes a wide character literal of the engine's character type
    - Converts an FName to an FString
    - Formats numbers for the current culture
  answerIndex: 1
  explanation: Translation comes from LOCTEXT and NSLOCTEXT; TEXT only picks the literal's character type.
- id: explain-three-types
  type: explain-in-one-sentence
  prompt: In one sentence, say which string type you use for a score shown on the HUD and why.
  modelAnswer: FText, because it is what players read and it formats the number and the sentence for their language and culture.
  rubric:
    - Names FText
    - Mentions translation, culture, or number formatting
  explanation: FString would show the same digits everywhere and could never be translated.
```
