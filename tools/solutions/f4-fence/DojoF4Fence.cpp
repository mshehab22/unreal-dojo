#include "DojoF4Fence.h"

#include "Components/SceneComponent.h"
#include "Components/TextRenderComponent.h"

ADojoF4Fence::ADojoF4Fence()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoF4Fence::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);

	Rebuild();
}

void ADojoF4Fence::Rebuild()
{
	for (UTextRenderComponent* Post : Posts)
	{
		if (IsValid(Post)) Post->DestroyComponent();
	}
	Posts.Empty();

	for (int32 Index = 0; Index < PostCount; ++Index)
	{
		UTextRenderComponent* Post = NewObject<UTextRenderComponent>(this);
		Post->SetupAttachment(RootComponent);
		Post->SetRelativeLocation(FVector(Spacing * Index, 0.f, 0.f));
		Post->SetHorizontalAlignment(EHTA_Center);
		Post->SetText(FText::AsNumber(Index + 1));
		Post->RegisterComponent();
		AddInstanceComponent(Post);

		Posts.Add(Post);
	}
}

int32 ADojoF4Fence::GetBuiltPostCount() const
{
	return Posts.Num();
}

FVector ADojoF4Fence::GetPostLocation(int32 Index) const
{
	return Posts.IsValidIndex(Index) && IsValid(Posts[Index]) ? Posts[Index]->GetComponentLocation() : GetActorLocation();
}
