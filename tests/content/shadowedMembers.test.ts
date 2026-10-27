// Checks the C4458 shadow scan: what it flags, what MSVC lets through, the curated engine member list, and the verifier check around it.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { shadowedMemberCheck } from "../../tools/verifier/checks/shadowedMemberCheck";
import type { QuestRecord, VerifierInput } from "../../tools/verifier/ContentCheck";
import { ENGINE_CLASS_MEMBERS, engineClassFor, engineMemberOwners } from "../../tools/verifier/shadow/engineClassMembers";
import { findShadowedMembers, type ShadowFinding } from "../../tools/verifier/shadow/findShadowedMembers";
import { createContentFixture, type ContentFixture } from "./contentFixture";

let fixture: ContentFixture;

beforeEach(async () =>
{
	fixture = await createContentFixture();
});

afterEach(async () =>
{
	await fixture.remove();
});

/** Scans one header and source pair as a single unit and returns "kind name in Class::Function" for each finding. */
function scan(header: string, source: string = ""): string[]
{
	const files = [{ unit: "u", path: "A.h", text: header }, { unit: "u", path: "A.cpp", text: source }];

	return findShadowedMembers(files).map(describeFinding);
}

/** A short, comparable form of a finding. */
function describeFinding(finding: ShadowFinding): string
{
	return `${finding.kind} ${finding.name} in ${finding.className}::${finding.functionName} (${finding.owner})`;
}

describe("findShadowedMembers, engine members", () =>
{
	it("flags a parameter that hides AActor::Instigator (the A1050 case)", () =>
	{
		const header = "class ADojoCrate : public AActor { public: void Interact_Implementation(AActor* Instigator); };";
		const source = "void ADojoCrate::Interact_Implementation(AActor* Instigator)\n{\n	Use(Instigator);\n}\n";

		expect(scan(header, source)).toEqual(["parameter Instigator in ADojoCrate::Interact_Implementation (AActor)"]);
	});

	it("flags a local that hides AActor::bHidden (the A1060 case) and reports its line", () =>
	{
		const header = "class ADojoMaster : public AActor { void Show(); };";
		const source = "void ADojoMaster::Show()\n{\n	const bool bHidden = Compute();\n	Use(bHidden);\n}\n";
		const findings = findShadowedMembers([{ unit: "u", path: "A.h", text: header }, { unit: "u", path: "A.cpp", text: source }]);

		expect(findings.map(describeFinding)).toEqual(["local bHidden in ADojoMaster::Show (AActor)"]);
		expect(findings[0]?.line).toBe(3);
	});

	it.each(["Owner", "Tags", "Children", "RootComponent", "Role"])("flags %s hiding the AActor member", (name) =>
	{
		const header = "class ADojoThing : public AActor { void Run(); };";
		const source = `void ADojoThing::Run()\n{\n	int32 ${name} = 0;\n}\n`;

		expect(scan(header, source)).toEqual([`local ${name} in ADojoThing::Run (AActor)`]);
	});

	it("reads members through APawn, ACharacter, UActorComponent, USceneComponent, and UObject", () =>
	{
		const findingsFor = (declaration: string, local: string): string[] =>
		{
			const className = declaration.split(" ")[0] ?? "";
			const header = "class " + declaration + " { void Run(); };\nvoid " + className + "::Run()\n{\n	float " + local + " = 0;\n}\n";

			return scan(header).map((entry) => entry.replace(/ in .*? \(/, " ("));
		};

		expect(findingsFor("ADojoPawn : public APawn", "Controller")).toEqual(["local Controller (APawn)"]);
		expect(findingsFor("ADojoHero : public ACharacter", "Mesh")).toEqual(["local Mesh (ACharacter)"]);
		expect(findingsFor("ADojoHero : public ACharacter", "Instigator")).toEqual(["local Instigator (AActor)"]);
		expect(findingsFor("UDojoPart : public UActorComponent", "bIsActive")).toEqual(["local bIsActive (UActorComponent)"]);
		expect(findingsFor("UDojoMover : public USceneComponent", "AttachParent")).toEqual(["local AttachParent (USceneComponent)"]);
		expect(findingsFor("UDojoMover : public USceneComponent", "bIsActive")).toEqual(["local bIsActive (UActorComponent)"]);
		expect(findingsFor("UDojoPlain : public UObject", "ClassPrivate")).toEqual(["local ClassPrivate (UObject)"]);
		expect(findingsFor("UDojoPlain : public UObject", "Instigator")).toEqual([]);
	});

	it("does not flag World or bActive, which are not members in UE 5.8 (A1170)", () =>
	{
		const header = "class ADojoThing : public AActor { void Run(UWorld* World, bool bActive); };";
		const source = "void ADojoThing::Run(UWorld* World, bool bActive)\n{\n	UWorld* World2 = World;\n}\n";

		expect(scan(header, source)).toEqual([]);
		expect(ENGINE_CLASS_MEMBERS.AActor).not.toContain("World");
		expect(ENGINE_CLASS_MEMBERS.UActorComponent).not.toContain("bActive");
	});
});

describe("findShadowedMembers, the class's own members", () =>
{
	it("flags a parameter named like a data member of the class, including a bit field and a UPROPERTY one", () =>
	{
		const header = [
			"class ADojoLamp : public AActor",
			"{",
			"	GENERATED_BODY()",
			"public:",
			"	UPROPERTY(EditAnywhere, meta = (ClampMin = \"0\"))",
			"	float Brightness = 1.f;",
			"	uint8 bLit : 1;",
			"	TArray<TObjectPtr<AActor>> Neighbours;",
			"	void Configure(float Brightness, bool bLit);",
			"};",
		].join("\n");
		const source = "void ADojoLamp::Configure(float Brightness, bool bLit)\n{\n}\n";

		expect(scan(header, source)).toEqual(["parameter Brightness in ADojoLamp::Configure (ADojoLamp)", "parameter bLit in ADojoLamp::Configure (ADojoLamp)"]);
	});

	it("flags inline methods and locals declared in a for header, an if header, and a range for", () =>
	{
		const header = [
			"class ADojoCounter : public AActor",
			"{",
			"	int32 Count = 0;",
			"	AActor* Target = nullptr;",
			"	void Run(const TArray<AActor*>& Items)",
			"	{",
			"		for (int32 Count = 0; Count < 3; ++Count) {}",
			"		if (AActor* Target = Items[0]) {}",
			"		for (AActor* Owner : Items) {}",
			"	}",
			"};",
		].join("\n");

		expect(scan(header)).toEqual(["local Count in ADojoCounter::Run (ADojoCounter)", "local Target in ADojoCounter::Run (ADojoCounter)", "local Owner in ADojoCounter::Run (AActor)"]);
	});

	it("follows a Dojo base class to its members", () =>
	{
		const header = "class ADojoBase : public AActor { protected: int32 Charges = 0; };\nclass ADojoChild : public ADojoBase { void Use(int32 Charges); };";
		const source = "void ADojoChild::Use(int32 Charges)\n{\n}\n";

		expect(scan(header, source)).toEqual(["parameter Charges in ADojoChild::Use (ADojoBase)"]);
	});

	it("finds a base declared in another quest's files", () =>
	{
		const files = [
			{ unit: "solutions/first", path: "First.h", text: "class ADojoFirst : public AActor { protected: int32 Charges = 0; };" },
			{ unit: "starter/second", path: "Second.h", text: "class ADojoSecond : public ADojoFirst { void Use(int32 Charges); };" },
			{ unit: "starter/second", path: "Second.cpp", text: "void ADojoSecond::Use(int32 Charges) {}" },
		];

		expect(findShadowedMembers(files).map(describeFinding)).toEqual(["parameter Charges in ADojoSecond::Use (ADojoFirst)"]);
	});

	it("flags the second name in a multiple declaration and the constructor-style local", () =>
	{
		const header = "class ADojoPair : public AActor { int32 Left = 0; int32 Right = 0; void Run(); };";
		const source = "void ADojoPair::Run()\n{\n	int32 Spare = 0, Right = 1;\n	FVector Left(0, 0, 0);\n}\n";

		expect(scan(header, source)).toEqual(["local Right in ADojoPair::Run (ADojoPair)", "local Left in ADojoPair::Run (ADojoPair)"]);
	});
});

describe("findShadowedMembers, what MSVC lets through", () =>
{
	it("ignores a static member function (checked with cl /W4: no C4458 there)", () =>
	{
		const header = "class ADojoQuiver : public AActor { FName Kind; static ADojoQuiver* SpawnOfKind(UWorld* World, const FName& Kind); };";
		const source = "ADojoQuiver* ADojoQuiver::SpawnOfKind(UWorld* World, const FName& Kind)\n{\n	const FName Owner = Kind;\n	return nullptr;\n}\n";

		expect(scan(header, source)).toEqual([]);
	});

	it("still flags the non-static overload when a static one shares the name", () =>
	{
		const header = "class ADojoQuiver : public AActor { FName Kind; static void Make(FName Kind); void Make(int32 Kind); };";
		const source = "void ADojoQuiver::Make(int32 Kind) {}\n";

		expect(scan(header, source)).toEqual(["parameter Kind in ADojoQuiver::Make (ADojoQuiver)"]);
	});

	it("ignores lambda parameters and locals inside lambda bodies", () =>
	{
		const header = "class ADojoThing : public AActor { int32 Count = 0; void Run(); };";
		const source = "void ADojoThing::Run()\n{\n	auto Visit = [this](int32 Count)\n	{\n		const int32 Owner = Count;\n		return Owner;\n	};\n	Forward(Visit);\n}\n";

		expect(scan(header, source)).toEqual([]);
	});

	it("ignores a name that matches a member function, a nested type, or an unnamed parameter", () =>
	{
		const header = "class ADojoThing : public AActor { void Run(const FHitResult&, int32 GetOwner, FOwnerHandle Handle); struct FInner { int32 Inside; }; };";
		const source = "void ADojoThing::Run(const FHitResult&, int32 GetOwner, FOwnerHandle Handle)\n{\n	int32 Inside = 0;\n	int32 BeginPlay = 1;\n}\n";

		expect(scan(header, source)).toEqual([]);
	});

	it("ignores uses of a member name that are not declarations", () =>
	{
		const header = "class ADojoThing : public AActor { int32 Count = 0; void Run(); };";
		const source = "void ADojoThing::Run()\n{\n	Count = 5;\n	return;\n	Instigator = nullptr;\n	Owner->Destroy();\n	if (Count > 2) { delete Owner; }\n	UE_LOG(LogTemp, Log, TEXT(\"Instigator Owner\"));\n	// int32 Owner = 0;\n	/* int32 Role = 1; */\n}\n";

		expect(scan(header, source)).toEqual([]);
	});

	it("ignores free functions and classes that derive from nothing known", () =>
	{
		const header = "struct FDojoPlain { int32 Value = 0; };\nclass IDojoThing { };";
		const source = "static void Helper(AActor* Instigator) { int32 Owner = 0; }\nvoid FDojoPlain::Show(int32 Other) {}\n";

		expect(scan(header, source)).toEqual([]);
	});

	it("does not mistake a nested block's brace for the end of the class", () =>
	{
		const header = "class ADojoThing : public AActor { int32 Count = 0; void Run() { if (true) { int32 X = 0; } } int32 Later = 0; void More(int32 Later); };";
		const source = "void ADojoThing::More(int32 Later) {}\n";

		expect(scan(header, source)).toEqual(["parameter Later in ADojoThing::More (ADojoThing)"]);
	});
});

describe("engine member list", () =>
{
	it("holds the common clash names the task named, and only names that are members (A1170)", () =>
	{
		const actorMembers = engineMemberOwners("AActor");

		for (const name of ["Instigator", "Owner", "bHidden", "Tags", "Children", "RootComponent", "Role"]) expect(actorMembers.get(name)).toBe("AActor");

		expect(actorMembers.has("World")).toBe(false);
		expect(engineMemberOwners("UActorComponent").has("bActive")).toBe(false);
		expect(engineMemberOwners("ACharacter").get("Controller")).toBe("APawn");
		expect(engineMemberOwners("USceneComponent").get("bIsActive")).toBe("UActorComponent");
	});

	it("has no duplicate or empty names within one class", () =>
	{
		for (const [className, names] of Object.entries(ENGINE_CLASS_MEMBERS))
		{
			expect(names.every((name) => /^[A-Za-z_]\w*$/.test(name)), className).toBe(true);
			expect(new Set(names).size, className).toBe(names.length);
		}
	});

	it("maps uncurated engine bases to the nearest curated class", () =>
	{
		expect(engineClassFor("AGameModeBase")).toBe("AActor");
		expect(engineClassFor("ASpectatorPawn")).toBe("APawn");
		expect(engineClassFor("UStaticMeshComponent")).toBe("USceneComponent");
		expect(engineClassFor("UMovementComponent")).toBe("UActorComponent");
		expect(engineClassFor("UWorldSubsystem")).toBe("UObject");
		expect(engineClassFor("FTickableGameObject")).toBeUndefined();
		expect(engineClassFor("IInterface")).toBeUndefined();
	});
});

/** A verifier input with the given quests (build quests with a single starter) and the solutions folder. */
function inputWith(solutionsFolder: string, starters: Record<string, string>): VerifierInput
{
	const quests: QuestRecord[] = Object.entries(starters).map(([id, starter]) => ({
		file: `packs/p/worlds/01-w/${id}.md`,
		packId: "p",
		quest: {
			id, title: id, order: 1, kind: "build" as const, difficulty: 1, patterns: [], skills: [], terms: [], prerequisites: [], xp: 1, estimatedMinutes: 1, concepts: ["c"],
			scaffold: "worked" as const, brief: "b", files: [{ name: "A.cpp", starter }], tests: "t", hints: ["a", "b", "c"] as [string, string, string], rubric: ["1", "2", "3", "4", "5"], alternative: "a",
		},
	}));

	return { content: {} as VerifierInput["content"], examples: [], quests, solutionsFolder, release: false };
}

describe("shadowedMemberCheck", () =>
{
	it("reports a clash in a reference solution on the quest's file, as an error", async () =>
	{
		await mkdir(join(fixture.root, "q1"), { recursive: true });
		await writeFile(join(fixture.root, "q1", "A.h"), "class ADojoCrate : public AActor { void Use(AActor* Instigator); };");
		await writeFile(join(fixture.root, "q1", "A.cpp"), "void ADojoCrate::Use(AActor* Instigator) {}\n");

		const problems = await shadowedMemberCheck.run(inputWith(fixture.root, { q1: "" }));

		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatchObject({ file: "packs/p/worlds/01-w/q1.md", section: "Files" });
		expect(problems[0]?.severity).toBeUndefined();
		expect(problems[0]?.message).toContain("solutions/q1/A.cpp line 1: parameter \"Instigator\" in ADojoCrate::Use hides a member of AActor");
		expect(problems[0]?.message).toContain("InInstigator");
	});

	it("reports a clash in a starter, with the starter's own line", async () =>
	{
		const starter = "class ADojoCrate : public AActor { void Use(AActor* Other); };\nvoid ADojoCrate::Use(AActor* Other)\n{\n	bool bHidden = false;\n}\n";
		const problems = await shadowedMemberCheck.run(inputWith(join(fixture.root, "missing"), { q2: starter }));

		expect(problems).toHaveLength(1);
		expect(problems[0]?.message).toContain("starter A.cpp line 4: local \"bHidden\" in ADojoCrate::Use hides a member of AActor");
	});

	it("reports a clash in a solutions folder that matches no quest under the file's own name", async () =>
	{
		await mkdir(join(fixture.root, "orphan"), { recursive: true });
		await writeFile(join(fixture.root, "orphan", "A.cpp"), "class ADojoThing : public AActor { void Use(AActor* Owner); };\nvoid ADojoThing::Use(AActor* Owner) {}\n");

		const problems = await shadowedMemberCheck.run(inputWith(fixture.root, {}));

		expect(problems.map((problem) => problem.file)).toEqual(["solutions/orphan/A.cpp"]);
	});

	it("passes clean solutions and a missing solutions folder", async () =>
	{
		await mkdir(join(fixture.root, "q3"), { recursive: true });
		await writeFile(join(fixture.root, "q3", "A.cpp"), "class ADojoCrate : public AActor { void Use(AActor* InInstigator); };\nvoid ADojoCrate::Use(AActor* InInstigator) {}\n");

		expect(await shadowedMemberCheck.run(inputWith(fixture.root, { q3: "" }))).toEqual([]);
		expect(await shadowedMemberCheck.run(inputWith(join(fixture.root, "nowhere"), {}))).toEqual([]);
	});
});
