---
id: example-concept-uproperty
title: UPROPERTY puts a field in the editor
order: 1
kind: concept
difficulty: 1
patterns: []
skills: [reflection]
terms: [uproperty, reflection, editanywhere, visibleanywhere]
prerequisites: []
xp: 20
estimatedMinutes: 6
concepts:
  - A plain C++ field is invisible to the engine
  - UPROPERTY with EditAnywhere shows a field in the Details panel
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a lantern actor has a plain `float Brightness = 5.f;` member with no macro above it. You place the lantern in a level and select it. What do you see in the Details panel?"
choices:
  - A Brightness field set to 5
  - No Brightness field at all
  - A Brightness field set to 0
  - A compile error when the level opens
answerIndex: 1
explanation: The Details panel only lists properties the reflection system knows about, and a field without UPROPERTY is unknown to it.
```

# Card

Unreal's editor, garbage collector, and save system can only see what the **reflection** system has been told about. A plain C++ member is ordinary memory: it works in code, but the engine cannot list it, save it, or show it.

Put `UPROPERTY()` on the line above a member and the Unreal Header Tool records it. The specifiers inside the brackets say what the engine may do with it:

- `EditAnywhere` lets you change it on the class default and on every placed instance.
- `VisibleAnywhere` shows it read only.
- `BlueprintReadWrite` lets Blueprint graphs get and set it.
- `Category = "Lantern"` groups it under a heading in the Details panel.

Every pointer to a UObject must also carry `UPROPERTY()`, even with no specifiers, so the garbage collector knows the object is still in use.

# Example

```cpp
/** A lantern actor whose point light glows at an editable brightness. */
UCLASS()
class ADojoExLantern : public AActor
{
	GENERATED_BODY()

public:
	// Shown and editable on every placed lantern, grouped under "Lantern".
	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 5.f;

	// Invisible to the editor: no UPROPERTY.
	float SecretFlicker = 0.2f;
};
```

# Questions

```yaml
- id: fill-specifier
  type: fill-blank
  prompt: To let a designer change a float on each placed lantern in the Details panel, write UPROPERTY(___, Category = "Lantern").
  acceptedAnswers: [EditAnywhere, EditInstanceOnly]
  explanation: EditAnywhere allows edits on the class default and on instances; EditInstanceOnly allows instances only. Both answer the question.
- id: spot-missing-macro
  type: spot-the-bug
  prompt: Sometimes the light this pointer refers to is destroyed while the lantern still holds the pointer, and the next use crashes on a dangling pointer. Which line is wrong?
  code: |
    UCLASS()
    class ADojoExLantern : public AActor
    {
    	GENERATED_BODY()
    	TObjectPtr<UPointLightComponent> Light;
    };
  bugLine: 5
  fix: Put UPROPERTY() on the line above the pointer.
  explanation: The garbage collector only follows pointers that reflection knows about, so it can destroy the object behind an unmarked pointer and leave that pointer dangling.
- id: visible-versus-edit
  type: multiple-choice
  prompt: You want the Details panel to show a component but never let anyone swap it for another one. Which specifier fits?
  choices: [EditAnywhere, VisibleAnywhere, BlueprintReadWrite, Transient]
  answerIndex: 1
  explanation: VisibleAnywhere shows the property read only; the component's own settings can still be edited inside it.
- id: explain-reflection
  type: explain-in-one-sentence
  prompt: In one sentence, say why a field with no UPROPERTY never shows up in the Details panel.
  modelAnswer: The Details panel lists only properties the reflection system has recorded, and UPROPERTY is what records a field.
  rubric:
    - Names reflection or the Unreal Header Tool
    - Says UPROPERTY is what registers the field
  explanation: The editor reads the reflection data, not your C++ source.
```
