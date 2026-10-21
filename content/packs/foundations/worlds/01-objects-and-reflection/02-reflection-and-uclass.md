---
id: f1-reflection-and-uclass
title: Reflection, UCLASS, and the generated header
order: 2
kind: concept
difficulty: 1
patterns: []
skills: [reflection]
terms: [reflection, uclass, generated-body, generated-h-include, unreal-header-tool, forward-declaration, api-macro]
prerequisites: [f1-uobject-and-actor]
xp: 20
estimatedMinutes: 6
concepts:
  - The Unreal Header Tool reads the macros and writes generated code before the compiler runs
  - A reflected header includes its generated header last and opens the class with GENERATED_BODY
  - Forward declarations keep headers light
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: in a reflected actor header, someone adds `#include \"Components/BoxComponent.h\"` below the `.generated.h` line. What happens when you build?"
choices:
  - Nothing, include order never matters in C++
  - The header tool stops with an error about the generated header not being last
  - The build passes but the box component is hidden in the editor
  - The linker reports a duplicate symbol
answerIndex: 1
explanation: The header tool insists that the generated header is the final include, and it reports the file and line before the compiler ever starts.
```

# Card

C++ cannot list its own classes or fields at run time. Unreal adds that ability, called **reflection**, with a step that runs before the compiler: the **Unreal Header Tool** (UHT) reads every header that uses the reflection macros and writes extra code describing each class, property, and function. The editor, Blueprint, saving, the console, and the garbage collector all read that description.

Three things make a class reflected:

- `UCLASS()` above the class tells UHT to describe it. Specifiers inside, such as `Blueprintable`, change how the editor treats it.
- `GENERATED_BODY()` as the first line in the class body is where UHT's code is pasted in.
- `#include "<FileName>.generated.h"` as the **last** include of the header brings that code in.

Keep headers light with **forward declarations**: `class UTextRenderComponent;` tells the compiler the type exists, which is enough for a pointer member. The full include goes in the `.cpp` that calls functions on it, so changing one header rebuilds fewer files.

The editor's class wizard writes `DOJO_API` between `class` and the name. That **module API macro** exports the class for other modules. Every quest here lives inside the single Dojo module, so quest classes leave it out.

# Example

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1Signpost.generated.h"

// Enough for a pointer member; the .cpp includes the real header.
class UTextRenderComponent;

// A signpost that shows a word above itself.
UCLASS()
class ADojoF1Signpost : public AActor
{
	GENERATED_BODY()

public:
	ADojoF1Signpost();

	UPROPERTY(VisibleAnywhere, Category = "Signpost")
	TObjectPtr<UTextRenderComponent> Label;
};
```

# Questions

```yaml
- id: order-of-includes
  type: multiple-choice
  prompt: "Which include must come first in a reflected header, before the base class header?"
  choices:
    - The .generated.h header
    - CoreMinimal.h
    - Engine.h
    - The .cpp file of the same class
  answerIndex: 1
  explanation: CoreMinimal.h brings the basic types everything else uses; the base class header follows, and the generated header closes the list.
- id: fill-generated-body
  type: fill-blank
  prompt: "The first line inside the braces of a UCLASS is ___()."
  acceptedAnswers: [GENERATED_BODY]
  explanation: GENERATED_BODY marks where the header tool's code is inserted into the class.
- id: spot-forward-declaration
  type: spot-the-bug
  prompt: This header compiles, but every file that includes it now pulls in the whole text render header. Which line should be a forward declaration instead?
  code: |
    #pragma once
    #include "CoreMinimal.h"
    #include "GameFramework/Actor.h"
    #include "Components/TextRenderComponent.h"
    #include "DojoF1Signpost.generated.h"
  bugLine: 4
  fix: Replace the include with a forward declaration of UTextRenderComponent and include the header in the .cpp file.
  explanation: A pointer member only needs to know the type exists; the full definition is needed where functions are called on it.
- id: explain-uht
  type: explain-in-one-sentence
  prompt: In one sentence, say what the Unreal Header Tool does and when it runs.
  modelAnswer: Before the C++ compiler runs, the Unreal Header Tool reads the reflection macros in headers and writes the generated code that describes those classes, properties, and functions to the engine.
  rubric:
    - Says it runs before compiling
    - Says it reads the macros and writes generated code or reflection data
  explanation: A typo in a specifier is therefore reported by the header tool, not by the compiler.
```
